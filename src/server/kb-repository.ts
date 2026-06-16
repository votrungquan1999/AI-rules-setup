import { type Collection, ObjectId } from "mongodb";
import { getDatabase } from "./database";
import { KB_DOCS_COLLECTION_NAME, type KbDoc, KbStatus, KbType, type StoredKbDocDocument } from "./types";

interface FindDraftsOptions {
	type?: KbType;
	scope?: string;
}

interface FindCanonicalOptions {
	scopes: string[];
	type?: KbType;
}

interface UpdateKbFields {
	title?: string;
	body?: string;
}

/** Module-scoped guard so indexes are created at most once per process. */
let indexesEnsured = false;

/**
 * Lazily creates the compound index backing scope/status/type queries. Awaited at the top of
 * every exported function that touches the collection; the module-scoped guard makes it a no-op
 * after the first successful run.
 * @returns The typed kb_docs collection
 */
async function getKbCollection(): Promise<Collection<StoredKbDocDocument>> {
	const db = await getDatabase();
	const collection = db.collection<StoredKbDocDocument>(KB_DOCS_COLLECTION_NAME);
	if (!indexesEnsured) {
		await collection.createIndex({ scope: 1, status: 1, type: 1 });
		indexesEnsured = true;
	}
	return collection;
}

/**
 * Converts a stored KB document into the client-facing `KbDoc` shape:
 * `_id` → string `id`, Date fields → ISO strings.
 * @param doc - The raw stored document
 * @returns The client-facing KB document
 */
function toKbDoc(doc: StoredKbDocDocument): KbDoc {
	const kbDoc: KbDoc = {
		id: (doc._id as ObjectId).toHexString(),
		type: doc.type,
		status: doc.status,
		title: doc.title,
		body: doc.body,
		scope: doc.scope,
		createdAt: doc.createdAt.toISOString(),
		updatedAt: doc.updatedAt.toISOString(),
	};
	if (doc.agent !== undefined) kbDoc.agent = doc.agent;
	if (doc.reviewedAt !== undefined) kbDoc.reviewedAt = doc.reviewedAt.toISOString();
	return kbDoc;
}

/**
 * Lists draft KB documents awaiting review, optionally narrowed by type and/or a single scope.
 * @param options - Optional `type` and `scope` filters
 * @returns Matching draft documents as client-facing `KbDoc[]`
 */
export async function findKbDrafts(options: FindDraftsOptions = {}): Promise<KbDoc[]> {
	const collection = await getKbCollection();
	const filter: { status: KbStatus; type?: KbType; scope?: string } = { status: KbStatus.Draft };
	if (options.type) filter.type = options.type;
	if (options.scope) filter.scope = options.scope;
	const documents = await collection.find(filter).toArray();
	return documents.map(toKbDoc);
}

/**
 * Returns approved (canonical) KB documents whose `scope` intersects any of `scopes`.
 * Drafts are never returned. Guards an empty `scopes` list to `[]` (no scope = no match).
 * @param options - Required `scopes` and optional `type` filter
 * @returns Matching canonical documents as client-facing `KbDoc[]`
 */
export async function findCanonicalKbDocs(options: FindCanonicalOptions): Promise<KbDoc[]> {
	if (options.scopes.length === 0) return [];
	const collection = await getKbCollection();
	const filter: { status: KbStatus; scope: { $in: string[] }; type?: KbType } = {
		status: KbStatus.Canonical,
		scope: { $in: options.scopes },
	};
	if (options.type) filter.type = options.type;
	const documents = await collection.find(filter).toArray();
	return documents.map(toKbDoc);
}

/**
 * Fetches a single KB document by its hex `_id` string.
 * @param _id - The document's MongoDB `_id` hex string
 * @returns The client-facing `KbDoc`, or null if not found
 */
export async function getKbDoc(id: string): Promise<KbDoc | null> {
	const collection = await getKbCollection();
	const document = await collection.findOne({ _id: new ObjectId(id) });
	return document ? toKbDoc(document) : null;
}

/**
 * Inserts a new draft KB document and returns its hex `_id`.
 * @param _draft - The document fields to persist
 * @returns The inserted document's `_id` hex string
 */
export async function insertKbDraft(draft: {
	type: KbType;
	title: string;
	body: string;
	scope: string[];
	agent?: string;
}): Promise<string> {
	const collection = await getKbCollection();
	const now = new Date();
	const document: StoredKbDocDocument = {
		type: draft.type,
		status: KbStatus.Draft,
		title: draft.title,
		body: draft.body,
		scope: draft.scope,
		createdAt: now,
		updatedAt: now,
	};
	if (draft.agent !== undefined) document.agent = draft.agent;
	const result = await collection.insertOne(document);
	return result.insertedId.toHexString();
}

/**
 * Promotes a draft document to canonical, stamping `reviewedAt`/`updatedAt`.
 * Only matches documents still in draft status (prevents re-approving canonicals).
 * @param _id - The document's `_id` hex string
 * @returns True when a draft was promoted; false when none matched
 */
export async function approveKbDoc(id: string): Promise<boolean> {
	const collection = await getKbCollection();
	const now = new Date();
	const result = await collection.updateOne(
		{ _id: new ObjectId(id), status: KbStatus.Draft },
		{ $set: { status: KbStatus.Canonical, reviewedAt: now, updatedAt: now } },
	);
	return result.modifiedCount === 1;
}

/**
 * Permanently deletes a KB document (reviewer rejection).
 * @param _id - The document's `_id` hex string
 * @returns True when a document was deleted; false when none matched
 */
export async function rejectKbDoc(id: string): Promise<boolean> {
	const collection = await getKbCollection();
	const result = await collection.deleteOne({ _id: new ObjectId(id) });
	return result.deletedCount === 1;
}

/**
 * Edits a draft's `title` and/or `body`, keeping its draft status (does NOT auto-approve).
 * @param _id - The document's `_id` hex string
 * @param _fields - The fields to update (at least one of title/body)
 * @returns True when a document was updated; false when none matched
 */
export async function updateKbDoc(id: string, fields: UpdateKbFields): Promise<boolean> {
	const collection = await getKbCollection();
	const $set: { title?: string; body?: string; updatedAt: Date } = { updatedAt: new Date() };
	if (fields.title !== undefined) $set.title = fields.title;
	if (fields.body !== undefined) $set.body = fields.body;
	const result = await collection.updateOne({ _id: new ObjectId(id) }, { $set });
	return result.matchedCount === 1;
}

/** Maximum number of memories returned per scope; memories load into every session so the cap keeps context small. */
const MAX_MEMORIES_PER_SCOPE = 15;

/**
 * Returns canonical memory-type documents whose `scope` intersects any of `scopes`, enforcing a
 * per-scope cap of {@link MAX_MEMORIES_PER_SCOPE}. The cap is applied server-side so the CLI
 * never materializes more than the limit per scope. Guards an empty `scopes` list to `[]`.
 * @param scopes - The workspace's declared scope tags
 * @returns Matching canonical memory documents as client-facing `KbDoc[]`, capped per scope
 */
export async function findCanonicalMemories(scopes: string[]): Promise<KbDoc[]> {
	if (scopes.length === 0) return [];
	const collection = await getKbCollection();
	const documents = await collection
		.find({ status: KbStatus.Canonical, type: KbType.Memory, scope: { $in: scopes } })
		.toArray();

	// Enforce the per-scope cap. A memory tagged with several in-scope tags counts toward each of
	// its scopes; once any of its scopes is full it is dropped. De-dupe by id so a memory matching
	// multiple scopes is returned at most once.
	const perScopeCount = new Map<string, number>();
	const selected = new Map<string, KbDoc>();
	for (const doc of documents) {
		const matchingScopes = doc.scope.filter((s) => scopes.includes(s));
		const hasRoom = matchingScopes.some((s) => (perScopeCount.get(s) ?? 0) < MAX_MEMORIES_PER_SCOPE);
		if (!hasRoom) continue;
		const kbDoc = toKbDoc(doc);
		if (selected.has(kbDoc.id)) continue;
		selected.set(kbDoc.id, kbDoc);
		for (const s of matchingScopes) {
			perScopeCount.set(s, (perScopeCount.get(s) ?? 0) + 1);
		}
	}
	return [...selected.values()];
}

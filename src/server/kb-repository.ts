import { type Collection, type Filter, ObjectId } from "mongodb";
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
	scope?: string[];
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
 * Returns approved (canonical) KB documents that either intersect `scopes` OR are global
 * (empty stored scope). Global docs surface for every workspace, additively with scoped matches;
 * an empty `scopes` arg therefore returns global docs only. Drafts are never returned.
 * @param options - Required `scopes` and optional `type` filter
 * @returns Matching canonical documents as client-facing `KbDoc[]`
 */
export async function findCanonicalKbDocs(options: FindCanonicalOptions): Promise<KbDoc[]> {
	const collection = await getKbCollection();
	const filter: Filter<StoredKbDocDocument> = {
		status: KbStatus.Canonical,
		$or: [{ scope: { $in: options.scopes } }, { scope: { $size: 0 } }],
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
	const document: Omit<StoredKbDocDocument, "_id"> = {
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
 * Bulk-promotes the matching draft documents to canonical in a single update. Ids that are
 * malformed, missing, or already canonical are silently filtered out — only ids that flipped
 * from draft are returned, so callers can update their list without guessing what happened.
 * @param ids - Hex `_id` strings to approve (any non-hex value is ignored)
 * @returns The subset of `ids` that were drafts and have now been promoted to canonical
 */
export async function approveKbDocs(ids: string[]): Promise<string[]> {
	const validIds = ids.filter((id) => ObjectId.isValid(id));
	if (validIds.length === 0) return [];
	const collection = await getKbCollection();
	const objectIds = validIds.map((id) => new ObjectId(id));
	// Snapshot which of the requested ids are actually drafts BEFORE the bulk update, so the
	// post-update reply lists the ids that actually flipped — not the ids the caller asked about.
	const matchingDrafts = await collection
		.find({ _id: { $in: objectIds }, status: KbStatus.Draft }, { projection: { _id: 1 } })
		.toArray();
	if (matchingDrafts.length === 0) return [];
	const matchingObjectIds = matchingDrafts.map((doc) => doc._id as ObjectId);
	const now = new Date();
	await collection.updateMany(
		{ _id: { $in: matchingObjectIds } },
		{ $set: { status: KbStatus.Canonical, reviewedAt: now, updatedAt: now } },
	);
	return matchingObjectIds.map((oid) => oid.toHexString());
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
 * Edits a doc's `title`, `body`, and/or `scope`. Does NOT change its status — so reviewers can
 * retag a canonical memory (e.g. promote one from a workspace scope to global by passing
 * `scope: []`) without re-running the approve flow.
 * @param _id - The document's `_id` hex string
 * @param _fields - The fields to update (at least one of title/body/scope)
 * @returns True when a document was updated; false when none matched
 */
export async function updateKbDoc(id: string, fields: UpdateKbFields): Promise<boolean> {
	const collection = await getKbCollection();
	const $set: { title?: string; body?: string; scope?: string[]; updatedAt: Date } = { updatedAt: new Date() };
	if (fields.title !== undefined) $set.title = fields.title;
	if (fields.body !== undefined) $set.body = fields.body;
	if (fields.scope !== undefined) $set.scope = fields.scope;
	const result = await collection.updateOne({ _id: new ObjectId(id) }, { $set });
	return result.matchedCount === 1;
}

/** Maximum number of memories returned per scope. Set intentionally huge so nothing is trimmed today; the cap loop is retained as the single tunable control point — lower this if memory context ever grows too large. Global memories count against their own bucket. */
const MAX_MEMORIES_PER_SCOPE = 1_000_000;

/** Bucket key that global (empty-scope) memories count against, since they have no scope tag of their own. */
const GLOBAL_MEMORY_BUCKET = "__global__";

/**
 * Returns canonical memory-type documents that either intersect `scopes` OR are global (empty
 * stored scope), enforcing a per-bucket cap of {@link MAX_MEMORIES_PER_SCOPE}. Global memories
 * load into every workspace and count against their own {@link GLOBAL_MEMORY_BUCKET}. An empty
 * `scopes` arg returns global memories only.
 * @param scopes - The workspace's declared scope tags
 * @returns Matching canonical memory documents as client-facing `KbDoc[]`, capped per bucket
 */
export async function findCanonicalMemories(scopes: string[]): Promise<KbDoc[]> {
	const collection = await getKbCollection();
	const documents = await collection
		.find({
			status: KbStatus.Canonical,
			type: KbType.Memory,
			$or: [{ scope: { $in: scopes } }, { scope: { $size: 0 } }],
		})
		.toArray();

	// Enforce the per-bucket cap. A memory counts toward each in-scope tag it carries; a global
	// memory (no scope) counts toward GLOBAL_MEMORY_BUCKET. Once any of a memory's buckets is full
	// it is dropped. De-dupe by id so a memory matching multiple scopes is returned at most once.
	const perBucketCount = new Map<string, number>();
	const selected = new Map<string, KbDoc>();
	for (const doc of documents) {
		const buckets = doc.scope.length === 0 ? [GLOBAL_MEMORY_BUCKET] : doc.scope.filter((s) => scopes.includes(s));
		const hasRoom = buckets.some((b) => (perBucketCount.get(b) ?? 0) < MAX_MEMORIES_PER_SCOPE);
		if (!hasRoom) continue;
		const kbDoc = toKbDoc(doc);
		if (selected.has(kbDoc.id)) continue;
		selected.set(kbDoc.id, kbDoc);
		for (const b of buckets) {
			perBucketCount.set(b, (perBucketCount.get(b) ?? 0) + 1);
		}
	}
	return [...selected.values()];
}

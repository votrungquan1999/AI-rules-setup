import { randomUUID } from "node:crypto";
import { closeDatabase, getCurrentDatabaseName, getDatabase } from "../../src/server/database";
import { PRIVATE_SKILLS_COLLECTION_NAME, type StoredPrivateSkillDocument } from "../../src/server/types";

/**
 * Outcome of a single migration run, so callers (and the CLI summary) can report what changed.
 */
export interface AddPrivateSkillIdsResult {
	/** Total private-skill documents examined. */
	scanned: number;
	/** Documents that were missing an id and had one assigned by this run. */
	updated: number;
	/** Documents that already carried an id and were left untouched (idempotency). */
	alreadyHadId: number;
}

/**
 * Backfills a permanent `id` onto every private-skill document that predates the id field.
 *
 * Idempotent and race-safe: each write is scoped with `{ id: { $exists: false } }`, so a document
 * that already has an id (or that a concurrent run just assigned one to) is never overwritten.
 * Mirrors the lazy backfill in `findAllPrivateSkills`, but applies it eagerly across the whole
 * collection in one pass so ids do not depend on the reviewer page ever loading.
 * @returns Counts of scanned, updated, and already-identified documents
 */
export async function addPrivateSkillIds(): Promise<AddPrivateSkillIdsResult> {
	const db = await getDatabase();
	const collection = db.collection<StoredPrivateSkillDocument>(PRIVATE_SKILLS_COLLECTION_NAME);
	const documents = await collection.find({}).toArray();

	let updated = 0;
	let alreadyHadId = 0;
	for (const doc of documents) {
		if (doc.id !== undefined) {
			alreadyHadId++;
			continue;
		}
		// Scope the write with `id: { $exists: false }` so it is a no-op if the doc was identified
		// in the meantime (re-run or concurrent backfill) — the id is never overwritten.
		const result = await collection.updateOne(
			{ agent: doc.agent, name: doc.name, id: { $exists: false } },
			{ $set: { id: randomUUID() } },
		);
		if (result.modifiedCount === 1) updated++;
	}

	return { scanned: documents.length, updated, alreadyHadId };
}

/**
 * CLI entry point: runs the migration against the configured MongoDB, prints a summary, and closes
 * the connection. Exits non-zero on failure so it can gate a deploy step.
 */
async function main(): Promise<void> {
	const dbName = getCurrentDatabaseName();
	console.log(`Backfilling private-skill ids in database "${dbName}"...`);
	const result = await addPrivateSkillIds();
	console.log(`Done. Scanned ${result.scanned}, updated ${result.updated}, already had an id ${result.alreadyHadId}.`);
	await closeDatabase();
}

// Run only when invoked directly (e.g. via tsx), not when imported by a test.
if (require.main === module) {
	main().catch(async (error) => {
		console.error("Migration failed:", error);
		await closeDatabase();
		process.exit(1);
	});
}

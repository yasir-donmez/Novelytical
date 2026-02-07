const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

// Collections to clear
const COLLECTIONS = [
    'comments',
    'libraries',
    'reviews',
    'review_interactions',
    'post_votes' // Clearing votes too just in case
];

async function deleteCollection(collectionPath, batchSize) {
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.orderBy('__name__').limit(batchSize);

    return new Promise((resolve, reject) => {
        deleteQueryBatch(db, query, resolve).catch(reject);
    });
}

async function deleteQueryBatch(db, query, resolve) {
    const snapshot = await query.get();

    const batchSize = snapshot.size;
    if (batchSize === 0) {
        resolve();
        return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    process.stdout.write(`Deleted ${batchSize} docs in ${query._queryOptions.collectionId}\n`);

    process.nextTick(() => {
        deleteQueryBatch(db, query, resolve);
    });
}

async function main() {
    console.log('Starting full cleanup...');

    for (const col of COLLECTIONS) {
        console.log(`Clearing collection: ${col}...`);
        await deleteCollection(col, 500);
        console.log(`Finished clearing ${col}.`);
    }

    console.log('All specified collections cleared successfully.');
}

main().catch(console.error);

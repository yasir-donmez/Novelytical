
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function clearCollection(collectionPath) {
    const collectionRef = db.collection(collectionPath);
    const snapshot = await collectionRef.get();

    if (snapshot.empty) {
        console.log(`No documents found in ${collectionPath}.`);
        return;
    }

    console.log(`Found ${snapshot.size} documents in ${collectionPath}. Deleting...`);

    const batchSize = 100;
    let batch = db.batch();
    let count = 0;

    for (const doc of snapshot.docs) {
        batch.delete(doc.ref);
        count++;

        // Check if subcollections exist (e.g. votes)
        const votesRef = doc.ref.collection('votes');
        const votesSnapshot = await votesRef.get();
        if (!votesSnapshot.empty) {
            votesSnapshot.docs.forEach(voteDoc => {
                batch.delete(voteDoc.ref);
                count++;
            });
        }

        if (count >= batchSize) {
            await batch.commit();
            batch = db.batch();
            count = 0;
            process.stdout.write(".");
        }
    }

    if (count > 0) {
        await batch.commit();
    }
    console.log(`\nSuccessfully cleared ${collectionPath}.`);
}

async function main() {
    await clearCollection("comments");
}

main().catch(console.error);

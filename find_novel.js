
// Native fetch

// Use built-in fetch if node version > 18
async function findNovel() {
    try {
        const res = await fetch('http://localhost:5050/api/novels?pageSize=100');
        const json = await res.json();
        const novels = json.data;
        const target = novels.find(n => n.title.includes('Efsanevi') || n.title.includes('Yazılımcı'));
        if (target) {
            console.log(`FOUND_NOVEL_ID: ${target.id}`);
            console.log(`TITLE: ${target.title}`);
        } else {
            console.log('NOVEL_NOT_FOUND');
        }
    } catch (e) {
        console.error(e);
    }
}

findNovel();

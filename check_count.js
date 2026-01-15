
async function check() {
    try {
        const res = await fetch('http://localhost:5050/api/novels?pageSize=10&sortOrder=rating_desc');
        const json = await res.json();
        console.log(`TOTAL DB COUNT: ${json.totalRecords || json.data.length}`);
        if (json.data && json.data.length > 0) {
            console.log('LATEST NOVELS:', json.data.map(n => `${n.title} (${n.sourceUrl})`).join('\n'));
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}
check();

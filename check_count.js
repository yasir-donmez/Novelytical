
async function check() {
    try {
        const res = await fetch('http://localhost:5050/api/novels?pageSize=10&sortOrder=rating_desc');
        const json = await res.json();
        const count = json.data ? json.data.length : 0;
        console.log(`COUNT: ${count}`);
        if (count > 0) {
            console.log('TITLES:', json.data.map(n => n.title).join(', '));
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}
check();

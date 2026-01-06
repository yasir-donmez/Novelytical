
async function check() {
    try {
        const res = await fetch('http://localhost:5050/api/novels?pageSize=10&sortOrder=views_desc');
        const json = await res.json();
        const data = json.data || [];
        console.log(`COUNT: ${data.length}`);
        if (data.length > 0) {
            console.log('IDs:', data.map(n => n.id).join(', '));
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}
check();

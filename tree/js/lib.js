// lib.js
function removeDuplicates(arr) {
	const uniqueItems = [];
	const seen = new Set();

	for (const item of arr) {
		const key = JSON.stringify(item);

		if (!seen.has(key)) {
			seen.add(key);
			uniqueItems.push(item);
		}
	}
	return uniqueItems;
}

function removeAgentsRelations(agents, relations) {
	relations = relations.filter(rel => !agents.includes(rel.agent));
	return relations;
}

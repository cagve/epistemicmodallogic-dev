import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

// const MPL = require('MPL.js'); // [TEST]
class Logger {
	constructor() {
		this.logs = [];
	}

	addLog(message, type = 'info') {
		const timestamp = new Date().toISOString();
		this.logs.push({ timestamp, type, message });
	}

	getLogs() {
		return this.logs;
	}

	clearLogs() {
		this.logs = [];
	}
}


class Node {
	constructor(id, value, label, parent = null) {
		this.id = id;
		this.parent = parent;
		this.right = null;
		this.left = null;
		this.value = value;
		this.label = label;
	}

	isRoot() {
		return this.parent === null;
	}


	addSingleChild(id, formula, label = this.label) {
		let node = null
		if (this.left === null) {
			node = new Node(id, formula, label, this)
			this.left = node
		} else {
			return this.left.addSingleChild(id, formula, label)
		}
		return node;
	}

	addTwoChildren(id1, formula1, id2, formula2, label = this.label) {
		const node1 = new Node(id1, formula1, label, this);
		const node2 = new Node(id2, formula2, label, this);
		this.left = node1
		this.right = node2
		return [node1, node2]
	}

	typeOf() {
		const formula = this.value.json();
		if (formula.prop) {
			return "prop"
		} else if (formula.conj) {
			return "conj"
		} else if (formula.impl) {
			return "impl"
		} else if (formula.disj) {
			return "disj"
		} else if (formula.kno_start) {
			return "kno"
		} else if (formula.neg) {
			if (formula.neg.impl) {
				return "neg_impl"
			} else if (formula.neg.kno_start) {
				return "neg_kno"
			} else if (formula.neg.conj) {
				return "neg_conj"
			} else if (formula.neg.disj) {
				return "neg_disj"
			} else if (formula.neg.neg) {
				return "neg_neg"
			} else if (formula.neg.prop) {
				return "neg_prop"
			}
		} else {
			return null
		}
	}

	typeOfRule() {
		const type = this.typeOf()
		switch (type) {
			case "prop":
				return "prop"
			case "conj":
			case "neg_impl":
			case "neg_disj":
			case "neg_neg":
				return "alpha"
			case "impl":
			case "disj":
			case "neg_conj":
				return "beta"
			case "neg_kno":
				return "pi"
			case "kno":
				return "nu"
		}
	}
}


class Tableau {
	constructor(data) {
		if (typeof data === 'string') {
			var formula = new MPL.Wff(data)
			this.root = new Node(1, formula, new Label('1'));
		} else {
			this.root = this.fromD3(data)
		}
		this.alpha_group = []
		this.beta_group = []
		this.nu_group = []
		this.nu_disable = []
		this.pi_group = []
		this.logs = [];
		this.addAvailableNode(this.root)
	}

	fromD3(data, parentNode = null) {
		const node = new Node(
			data.id,
			new MPL.Wff(data.value.json()),
			data.label,
			parentNode
		);
		if (data.children && data.children.length > 0) {
			if (data.children.length === 1) {
				const child = this.fromD3(data.children[0], node);
				node.left = child;
			} else if (data.children.length === 2) {
				const leftChild = this.fromD3(data.children[0], node);
				const rightChild = this.fromD3(data.children[1], node);
				node.left = leftChild;
				node.right = rightChild;
			}
		}
		return node;
	}



	addLog(message, type = 'info') {
		const timestamp = new Date().toISOString();
		this.logs.push({ timestamp, type, message });
	}

	getLeafs(node = this.root, leafs = null) {
		if (leafs === null) {
			leafs = []
		}

		if (node === null) {
			return;
		}
		if (node.left === null && node.right === null) {
			if (!leafs.some(leaf => leaf.id === node.id)) {
				leafs.push(node);
			}
		} else {
			this.getLeafs(node.left, leafs)
			if (node.right !== null) {
				this.getLeafs(node.right, leafs)
			}
		}
		return leafs;
	}

	applyRule(data, logger = null) {
		var node = data;
		if (typeof data === "string") {
			node = this.getNodeFromId(data)
			if (!this.isAvailable(node)) {
				return null
			}
		}
		logger.addLog(`Applying rule on node ID: ${node.id}, formula: ${node.value.unicode()}`);
		this.removeAvailableNode(node)
		const formula = node.value.json();
		if (formula.prop) {
			console.log("No more rules applied here")
		} else if (formula.conj) {
			const formula1 = new MPL.Wff(MPL._jsonToASCII(formula.conj[0]))
			const formula2 = new MPL.Wff(MPL._jsonToASCII(formula.conj[1]))
			this.addSingleExtension(formula1, node)
			this.addSingleExtension(formula2, node)
		} else if (formula.impl) {
			const formula1 = MPL.negateWff(formula.impl[0])
			const formula2 = new MPL.Wff(MPL._jsonToASCII(formula.impl[1]))
			this.addDoubleExtension(formula1, formula2, node);
		} else if (formula.disj) {
			const formula1 = new MPL.Wff(MPL._jsonToASCII(formula.disj[0]))
			const formula2 = new MPL.Wff(MPL._jsonToASCII(formula.disj[1]))
			this.addDoubleExtension(formula1, formula2, node);
		} else if (formula.kno_start) {
			console.log("KNOW START")
			var currentWff = new MPL.Wff(MPL._jsonToASCII(formula));
			var term = new MPL.Wff(MPL._jsonToASCII(formula.kno_start.group_end[1]));
			const leafs = this.getLeafs(node);
			const isTActive = document.getElementById('ruleTToggle').checked;
			const is4Active = document.getElementById('rule4Toggle').checked;
			leafs.forEach(leaf => {
				const branch = this.getBranchFromLeaf(leaf)
				const exts = branch.getSimpleExtensions(node.label, isTActive) // If t Active simple extension add current extension
				if (exts.length === 0) {
					return
				}
				exts.forEach(label => {
					var newId = parseInt(leaf.id + '1');
					let newNode = leaf.addSingleChild(newId, term, label);
					this.addAvailableNode(newNode)
					if (is4Active) {
						if (!label.isInBase(currentWff, branch)) {
							var new4Id = newId = parseInt(newId + '1');
							let new4Node = leaf.addSingleChild(new4Id, currentWff, label);
							this.addAvailableNode(new4Node)
						}
					}
				})

			});
		} else if (formula.neg) {
			if (formula.neg.kno_start) {
				const agents = formula.neg.kno_start.group_end[0].prop.split('');
				var term = formula.neg.kno_start.group_end[1];
				const f1 = MPL.negateWff(term);
				const leafs = this.getLeafs(node);
				leafs.forEach(leaf => {
					const branch = this.getBranchFromLeaf(leaf);
					let labels = branch.getAllLabels().map(x => x.simplify())
					var count = 1
					var newLabel = node.label.addExtension(agents, count.toString());
					var flag = labels.includes(newLabel.simplify());
					while (flag) {
						count += 1
						newLabel = node.label.addExtension(agents, count.toString())
						flag = labels.includes(newLabel.simplify());
					}
					let newId = parseInt(leaf.id + '1');
					let newNode = leaf.addSingleChild(newId, f1, newLabel)
					console.log("HOLA")
					if (branch.isSuplerflous(newLabel)) {
						console.log("No node needed bc is superflous")
						return
					}
					this.addAvailableNode(newNode);
					this.updateNuGroup();
				})
			} else if (formula.neg.conj) {
				const f1 = MPL.negateWff(formula.neg.conj[0]);
				const f2 = MPL.negateWff(formula.neg.conj[1]);
				this.addDoubleExtension(f1, f2, node);
			} else if (formula.neg.disj) {
				const f1 = MPL.negateWff(formula.neg.disj[0]);
				const f2 = MPL.negateWff(formula.neg.disj[1]);
				this.addSingleExtension(f1, node)
				this.addSingleExtension(f2, node)
			} else if (formula.neg.impl) {
				const f1 = new MPL.Wff(MPL._jsonToASCII(formula.neg.impl[0]));
				const f2 = MPL.negateWff(formula.neg.impl[1]);
				this.addSingleExtension(f1, node)
				this.addSingleExtension(f2, node)
			} else if (formula.neg.neg) {
				const f1 = new MPL.Wff(MPL._jsonToASCII(formula.neg.neg));
				this.addSingleExtension(f1, node)
			} else if (formula.neg.prop) {
				console.log("No more rules applied here!")
			}
		}
		let leafs = this.getLeafs();

		const b = leafs[0];
		let leafsAva = leafs.filter((leaf) => this.isLeafAvailable(leaf));
		if (leafsAva.length === 0) {
			this.alpha_group = []
			this.beta_group = []
			this.nu_group = []
			this.pi_group = []
			return this.getClosedLeafs();
		} else {
			return this.getClosedLeafs();
		}
	}

	getClosedLeafs() {
		let closedLeafs = [];
		let leafs = this.getLeafs();
		leafs.forEach(leaf => {
			let branch = this.getBranchFromLeaf(leaf);
			if (branch.isClosed()) {
				closedLeafs.push(leaf);
			}
		})
		return closedLeafs;
	}

	addSingleExtension(formula, node = this.root, label = node.label) {
		const leafs = this.getLeafs(node);
		leafs.forEach(node => {
			var branch = this.getBranchFromLeaf(node)
			var base = label.getBase(branch)
			var flag = base.some(x => x.unicode() === formula.unicode())
			if (branch.isClosed() | flag) {
				return
			}
			var newId = parseInt(node.id + '1');
			const newNode = node.addSingleChild(newId, formula, label);
			this.addAvailableNode(newNode);
		})
	}

	addDoubleExtension(formula1, formula2, node = this.root, label = node.label) {
		const leafs = this.getLeafs(node);
		leafs.filter((leaf) => this.isLeafAvailable(leaf))
		leafs.forEach(node => {
			var newId1 = parseInt(node.id + '1');
			var newId2 = parseInt(node.id + '2');
			let [newNode1, newNode2] = node.addTwoChildren(newId1, formula1, newId2, formula2, label);
			this.addAvailableNode(newNode1)
			this.addAvailableNode(newNode2)
		})
	}


	preOrderTraversal(node = this.root) {
		if (node === null) {
			return
		}
		console.log(node.value.unicode() + ", ")
		this.preOrderTraversal(node.left);
		this.preOrderTraversal(node.right);
	}

	getBranchesFromNode(node) {
		let branches = [];
		if (node.left === null) {
			return [this.getBranchFromLeaf(node)]; //devuelve un array con un unico elemento
		}
		let leafs = this.getLeafs(node);
		leafs.forEach(x => branches.push(this.getBranchFromLeaf(x)));
		return branches
	}

	getBranchFromLeaf(leafNode) {
		// Verificar que el nodo sea una hoja
		if (leafNode.left !== null) {
			return null
		}

		const branch = new Branch();
		let currentNode = leafNode;

		while (currentNode !== null) {
			branch.addNode(currentNode);
			currentNode = currentNode.parent;
		}
		branch.nodes.reverse();
		return branch;
	}

	addAvailableNode(node) {
		const type = node.typeOfRule()
		switch (type) {
			case "alpha":
				this.alpha_group.push(node)
				break;
			case "beta":
				this.beta_group.push(node)
				break;
			case "pi":
				this.pi_group.push(node)
				break;
			case "nu":
				this.nu_group.push(node)
				break;
			default:
				return null;
		}
	}

	removeAvailableNode(node) {
		const type = node.typeOfRule()
		switch (type) {
			case "alpha":
				this.alpha_group = this.alpha_group.filter(item => item !== node)
				break;
			case "pi":
				this.pi_group = this.pi_group.filter(item => item !== node)
				break;
			case "beta":
				this.beta_group = this.beta_group.filter(item => item !== node)
				break;
			case "nu":
				this.nu_group = this.nu_group.filter(item => item !== node)
				break;
			default:
				return null
		}
	}

	toD3(node = this.root) {
		if (!node) return null;

		const d3Node = {
			name: node.value.toString(),
			id: node.id.toString(),
			value: node.value,
			label: node.label,
			children: []
		};
		if (node.left) {
			d3Node.children.push(this.toD3(node.left));
		}
		if (node.right) {
			d3Node.children.push(this.toD3(node.right));
		}
		if (d3Node.children.length === 0) {
			delete d3Node.children;
		}
		return d3Node;
	}

	//[FIX] Esta funcion podria hacerse desde el nodo que se actualiza y su rama en vez de iterar por todas.
	updateNuGroup(node = this.root) {
		if (!node) return;
		if (node.typeOf() === 'kno') {
			const formula = node.value.json();
			const agents = formula.kno_start.group_end[0].prop.split('');
			var termascii = MPL._jsonToASCII(formula.kno_start.group_end[1]);
			let branches = this.getBranchesFromNode(node);
			let label = node.label;
			branches.forEach(branch => {
				let exts = branch.getSimpleExtensions(label);
				if (exts.length === 0) {
					this.nu_group = this.nu_group.filter(item => item !== node)
				} else {
					exts.forEach(extLabel => {
						let base = extLabel.getBase(branch);
						let ascii = base.map((x) => x.ascii())
						const agentLabel = extLabel.value[extLabel.value.length - 2]
						if (!ascii.includes(termascii) && agents.includes(agentLabel)) {
							if (!this.nu_group.some(prevnode => prevnode.id === node.id)) {
								this.nu_group.push(node);
							}
						} else {
							this.nu_group = this.nu_group.filter(item => item !== node)
						}
					})
				}
			})
		}
		this.updateNuGroup(node.left);
		this.updateNuGroup(node.right);
	}

	isAvailable(data) {
		var node = data;
		if (typeof data === "string") {
			node = this.getNodeFromId(data)
		}
		var inAlpha = this.alpha_group.some(x => x.id === node.id);
		var inBeta = this.beta_group.some(x => x.id === node.id);
		var inNu = this.nu_group.some(x => x.id === node.id);
		var inPi = this.pi_group.some(x => x.id === node.id);

		return inAlpha || inBeta || inNu || inPi;
	}

	runTableau(logger) {
		while (this.alpha_group.length > 0 || this.beta_group.length > 0 || this.pi_group.length > 0 || this.nu_group.length > 0) {
			let leafs = this.getLeafs();
			let leafsAva = leafs.filter((leaf) => this.isLeafAvailable(leaf));
			if (leafsAva.length == 0) {
				console.log("NO more leafs open")
				break;
			} else if (this.alpha_group.length > 0) {
				this.alpha_group.forEach(node => {
					// logger.addLog(`Applying rule on node ID: ${node.id}, formula: ${node.value.unicode()}`);
					this.applyRule(node, logger);
				})
			} else if (this.nu_group.length > 0) {
				this.nu_group.forEach(node => {
					// logger.addLog(`Applying rule on node ID: ${node.id}, formula: ${node.value.unicode()}`);
					this.applyRule(node, logger);
				})
			} else if (this.beta_group.length > 0) {
				this.beta_group.forEach(node => {
					// logger.addLog(`Applying rule on node ID: ${node.id}, formula: ${node.value.unicode()}`);
					this.applyRule(node, logger);
				})
			} else if (this.pi_group.length > 0) {
				this.pi_group.forEach(node => {
					this.applyRule(node, logger);
				})
			}
		}
		logger.addLog(`Tableau ended`);
		return logger;
	}

	isEnded() {
		const leafs = this.getLeafs();
		return leafs.every(x => !this.isLeafAvailable(x))
	}

	isClosed() {
		const leafs = this.getLeafs();
		return leafs.some(leaf => {
			const branch = this.getBranchFromLeaf(leaf);
			return branch.isClosed()
		})
	}

	isLeafAvailable(leaf) {
		const branch = this.getBranchFromLeaf(leaf)
		return !branch.isClosed();
	}

	getNodeFromLeafId(id) {
		const searchId = Number(id);
		const leafs = this.getLeafs();
		return leafs.filter(d => Number(d.id) === searchId)[0];
	}

	getNodeFromId(id, node = this.root) {
		if (node === null) return null;
		if (node.id === Number(id)) {
			return node;
		}
		const leftResult = this.getNodeFromId(id, node.left);
		if (leftResult) return leftResult;

		// Search right subtree
		return this.getNodeFromId(id, node.right);
	}

}

class Label {
	constructor(labelStr) {
		this.value = this._parseLabel(labelStr); // Almacena el string directamente
	}

	_parseLabel(labelStr) {
		return labelStr.split('')
	}

	addExtension(agent, number) {
		const newArray = [...this.value, agent, number];
		return new Label(newArray.join(""));
	}

	toString() {
		return this.value.join("")
	}

	equal(label2) {
		return this.toString() === label2.toString()
	}

	getBase(branch) {
		let baseFormulas = [];
		branch.nodes.forEach(node => {
			if (this.equal(node.label)) {
				baseFormulas.push(node.value)
			}

		})
		return baseFormulas;
	}

	// 1a2b3a4 >> "1234"
	simplify() {
		const simplified = this.value.filter(elemento => !isNaN(Number(elemento)));
		return simplified.join("")
	}

	lenght() {
		return this.value.lenght;
	}


	isSublabel(label) {
		let l1 = this
		let l2 = label
		let l1simp = l1.simplify()
		let l2simp = l2.simplify()
		if (label.simplify().length <= this.simplify().length) {
			return false
		} else {
			let sub = l2simp.substring(0, l1simp.length);
			return sub === l1simp;
		}
	}


	isSimpleExtension(label) {
		let l1 = label
		let l2 = this
		let l1simp = l1.simplify()
		let l2simp = l2.simplify()
		return l1simp.length + 1 === l2simp.length && l1.isSublabel(l2);
	}

	isInBase(formula, branch) {
		const baseFormulas = this.getBase(branch);
		return baseFormulas.some(f => {
			if (f.ascii() === formula.ascii()) return true;
			return false;
		});
	}
}

class Branch {
	constructor() {
		this.nodes = [];
	}

	getLeaf() {
		return this.nodes.reduce((max, currentNode) => {
			return (currentNode.id > max.id) ? currentNode : max;
		});
	}

	addNode(node) {
		this.nodes.push(node);
	}

	isClosed() {
		return this.nodes.some((a, i) =>
			this.nodes.slice(i + 1).some(b => {
				const aLabel = a.label.simplify();
				const bLabel = b.label.simplify();
				const aType = a.typeOf();
				const bType = b.typeOf();
				if (aLabel === bLabel &&
					(aType === 'prop' || aType === 'neg_prop') &&
					(bType === 'prop' || bType === 'neg_prop')) {
					var neg = MPL.negateWff(b.value.json()).ascii();
					var current = a.value.ascii();
					return (neg === current);
				}
				return false
			})
		);
	}

	getAllLabels() {
		let labels = []
		this.nodes.forEach(x => labels.push(x.label));
		labels = labels.filter((value, index, array) =>  //remove duplicates
			array.indexOf(value) === index
		)
		return labels
	}

	isSuplerflous(label) {
		const labelSet = this.getAllLabels()
		var currentBase = label.getBase(this)
		return labelSet.some(labelPrima => {
			let basePrima = labelPrima.getBase(this);
			if (currentBase.length === 0) {
				return false
			}
			return currentBase.every(element => basePrima.includes(element))
		})
	}

	getSimpleExtensions(label, isTActive) {
		const labelSet = this.getAllLabels();
		const filtered = labelSet.filter((x) => x.isSimpleExtension(label))
		if (isTActive) {
			filtered.push(label)
		}
		return filtered;
	}

	getSimpleExtensionsAgent(label, agent) {
		const labelSet = this.getAllLabels();
		const filtered = labelSet.filter((x) => x.isSimpleExtension(label))
		return filtered;
	}

}

function toD3(node) {
	if (!node) return null;

	const d3Node = {
		name: node.value.toString(),
		id: node.id.toString(),
		value: node.value,
		label: node.label,
		children: []
	};
	if (node.left) {
		d3Node.children.push(toD3(node.left));
	}
	if (node.right) {
		d3Node.children.push(toD3(node.right));
	}
	if (d3Node.children.length === 0) {
		delete d3Node.children;
	}
	return d3Node;
}

function displayLogs(logger) {
	const container = d3.select("#log-container");
	container.classed("active", true)
		.classed("inactive", false);
	container.html("");

	container.selectAll(".log-line")
		.data(logger.getLogs())
		.enter()
		.append("div")
		.attr("class", d => `log-line ${d.type}`)
		.text(d => d.message);

	container.node().scrollTop = container.node().scrollHeight;
}

function computeRadius(d) {
	return (d.children || d._children) ? radius + (radius * nbEndNodes(d) / 10) : radius;
}

function nbEndNodes(d) {
	if (d.children) return d.children.reduce((acc, c) => acc + nbEndNodes(c), 0);
	if (d._children) return d._children.reduce((acc, c) => acc + nbEndNodes(c), 0);
	return 1;
}
function getVisibleDepth(node, depth = 0) {
	if (!node.children) return depth;
	return Math.max(...node.children.map(child => getVisibleDepth(child, depth + 1)));
}

function click(event, d) {
	if (d.children) {
		d._children = d.children;
		d.children = null;
	} else {
		d.children = d._children;
		d._children = null;
	}
	update(d);
	// highlightLink(d)

}

function dblClick(event, d) {
	columnAttribute.push(d.data.name);
}

function rclick(event, d) {
	event.preventDefault();
	if (currentTableau) {
		let closedLeafs = currentTableau.applyRule(d.id, logger);
		const newTreeData = currentTableau.toD3();
		root = d3.hierarchy(newTreeData, (d) => d.children);
		root.each(function(d) {
			d.id = d.data.id || d.id;  // Ensure IDs are not overwritten
		});
		root.x0 = container.clientWidth / 2;
		root.y0 = 0;
		// TODO: UNIFY IN THE BRAIN
		if (closedLeafs == null) {
			logger.addLog(`[Error] Can not apply rule to ID: ${d.id})}`);
		}
		if (currentTableau.isEnded()) {
			logger.addLog("Tableau finished");
		}
		update(d);
	}
}


let maxLabel = 150;
let duration = 500;
let radius = 5;
let tree, diagonal;
let i = 0;
let root;
let columnAttribute = [];
let currentTableau = null;
const logger = new Logger();
let container = document.getElementById('tree-container');
let svgBase, mainGroup, svg, linkGroup;

function runxx() {
	logger.clearLogs();
	d3.select("#tree-container").select("svg").remove();
	const formula = document.getElementById('treeFormulaInput').value;
	try {
		new MPL.Wff(formula);
	} catch (error) {
		alert("Syntax error: " + error.message);
		return
	}

	const tableau = new Tableau(formula);
	const isTActive = document.getElementById('ruleTToggle').checked;
	const msg = isTActive ? "Running Tableau for T" : "Running Tableau for K";
	logger.addLog(msg)
	tableau.runTableau(logger);
	const treeData = tableau.toD3();
	currentTableau = tableau;
	columnAttribute = [];
	i = 0;

	const btnFullscreen = document.getElementById('btn-fullscreen');
	if (btnFullscreen) {
		btnFullscreen.style.display = "inline-block";
	}



	svgBase = d3.select("#tree-container")
		.append("svg")
		.attr("width", "100%")
		.attr("height", "100%")
		.call(d3.zoom().on("zoom", (event) => {
			mainGroup.attr("transform", event.transform); // Mueve TODO el contenido
		}));

	mainGroup = svgBase.append("g");
	linkGroup = mainGroup.append("g")
		.attr("class", "tree")
		.attr("class", "links-layer")
		.attr("transform", `translate(0, ${maxLabel})`);

	svg = mainGroup.append("g")
		.attr("transform", `translate(0, ${maxLabel})`);

	// Set up tree layout
	tree = d3.tree().size([width, height - maxLabel * 2]);
	diagonal = d3.linkVertical()
		.x(d => d.x)
		.y(d => d.y);

	root = d3.hierarchy(treeData, (d) => d.children);
	root.each(function(d) {
		d.id = d.data.id || d.id;  // Ensure IDs are not overwritten
	});
	root.x0 = width / 2;
	root.y0 = 0;

	displayLogs(logger);
	update(root);
}

function update(source) {
	displayLogs(logger);

	const treeData = tree(root);
	const nodes = treeData.descendants();
	const links = treeData.links();

	nodes.forEach(d => {
		d.y = d.depth * maxLabel;
	});

	const node = svg.selectAll("g.node")
		.data(nodes, d => d.id || (d.id = ++i));

	const nodeEnter = node.enter().append("g")
		.attr("class", d => "node-tableau " + (currentTableau.isAvailable(d.id) ? "clickable" : "non-clickable"))
		.attr("transform", d => `translate(${source.x0},${source.y0})`);

	nodeEnter.append("circle")
		.attr("r", 0);

	nodeEnter.append("text")
		.attr("x", d => {
			const spacing = computeRadius(d.data) + 5;
			return d.children || d._children ? -spacing : spacing;
		})
		.attr("dy", "3")
		.attr("text-anchor", d => d.children || d._children ? "end" : "start")
		.text(d => `(${d.id}) ${d.data.label}: ${d.data.value.unicode()}`)
		.style("fill-opacity", 0);

	const nodeUpdate = node.merge(nodeEnter).transition()
		.duration(duration)
		.attr("transform", d => `translate(${d.x},${d.y})`);

	nodeUpdate.select("circle")
		.attr("r", d => computeRadius(d.data))
		// .attr("class", d => currentTableau.isAvailable(d.id) ? "node-circle-active" : "node-circle-disabled");
		.attr("class", d => {
			if (!d.children && !d._children) {
				const leafs = currentTableau.getClosedLeafs().map((leaf) => leaf.id)
				const isClosed = leafs.includes(Number(d.id))
				if (isClosed) return "close-leaf";
				if (!isClosed) return "open-leaf"
			}
			return currentTableau.isAvailable(d.id) ? "node-circle-active" : "node-circle-disabled";
		});

	nodeUpdate.select("text").style("fill-opacity", 1);

	const nodeExit = node.exit().transition()
		.duration(duration)
		.attr("transform", d => `translate(${source.x},${source.y})`)
		.remove();

	nodeExit.select("circle").attr("r", 0);
	nodeExit.select("text").style("fill-opacity", 0);

	const link = linkGroup.selectAll("path.link")
		.data(links, d => d.target.id);

	const linkEnter = link.enter().insert("path", "g")
		.attr("class", "link")
		.attr("d", d => {
			const o = { x: source.x0, y: source.y0 };
			return diagonal({ source: o, target: o });
		});

	link.merge(linkEnter).transition()
		.duration(duration)
		.attr("d", diagonal);

	link.exit().transition()
		.duration(duration)
		.attr("d", d => {
			const o = { x: source.x, y: source.y };
			return diagonal({ source: o, target: o });
		})
		.remove();

	nodes.forEach(d => {
		d.x0 = d.x;
		d.y0 = d.y;
	});

}




export {
	Node,
	Tableau,
	Branch,
	Label,
	Logger,
	runxx,
	toD3
};

window.Node = Node;
window.Tableau = Tableau;
window.Branch = Branch;
window.Label = Label;
window.Logger = Logger;
window.toD3 = toD3;
window.runxx = runxx;



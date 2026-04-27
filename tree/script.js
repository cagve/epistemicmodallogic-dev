// const MPL = require('../js/MPL.js'); // [TEST]

class Node {
	constructor(id,value, label, parent = null) {
		this.id = id;
		this.parent = parent;
		this.right = null;
		this.left = null;
		this.value = value;
		this.label = label;
	}
	
	isRoot(){
		return this.parent === null;
	}


	//formula = MLP formula
	addSingleChild(id, formula, label = this.label){
		if (this.left === null){
			let node = new Node(id, formula, label, this)
			this.left = node
			return node;
		}else{
			this.left.addSingleChild(id, formula, label)
		}
	}

	addTwoChildren(id1, formula1, id2, formula2, label=this.label){
		const node1 = new Node(id1, formula1, label, this);
		const node2 = new Node(id2, formula2, label, this);
		this.left = node1
		this.right = node2
		return [node1, node2]
	}

	typeOf(){
		const formula = this.value.json();
		if (formula.prop){
			return "prop"
		}else if(formula.conj){ 
			return "conj"
		}else if(formula.impl){ 
			return "impl"
		}else if(formula.disj){ 
			return "disj"
		}else if(formula.kno_start){ 
			return "kno"
		} else if(formula.neg){
			if (formula.neg.impl){
				return "neg_impl"
			} else if (formula.neg.kno_start){
				return "neg_kno"
			}else if(formula.neg.conj){
				return "neg_conj"
			}else if(formula.neg.disj){
				return "neg_disj"
			}else if(formula.neg.neg){
				return "neg_neg"
			}else if(formula.neg.prop){
				return "neg_prop"
			}
		}else{
			return null
		}
	}

	typeOfRule(){
		const type = this.typeOf()
		switch (type) {
			case "prop":
				return "prop"
			case "conj":
			case "neg_impl":
			case "neg_disj":
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
			// Si formula es un string, usamos MPL.Wff
			var formula = new MPL.Wff(data)
			this.root = new Node(1, formula, new Label('1'));
		} else {
			// Si formula no es un string, directamente la pasamos o la procesamos como corresponda
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

	getLeafs(node = this.root, leafs=null){
		if (leafs === null){
			leafs = []
		}

		if (node === null){
			return;
		}
		if (node.left === null && node.right === null){
			if (!leafs.some(leaf => leaf.id === node.id)) {
				leafs.push(node);
			}
		}else{
            this.getLeafs(node.left, leafs) 
			if(node.right !== null){
				this.getLeafs(node.right, leafs)
			}
		}
		return leafs;
	}
	
	applyRule(data, logger = null){
		var node = data;
		if (typeof data === "string"){
			node = this.getNodeFromId(data)
			if (!this.isAvailable(node)){
				return null
			}
		}
		logger.addLog(`Applying rule on node ID: ${node.id}, formula: ${node.value.unicode()}`);
		this.removeAvailableNode(node)
		const formula = node.value.json();
		if (formula.prop){
			console.log("No more rules applied here")
		}else if(formula.conj){ 
			const formula1 = new MPL.Wff(MPL._jsonToASCII(formula.conj[0]))
			const formula2 = new MPL.Wff(MPL._jsonToASCII(formula.conj[1]))
			this.addSingleExtension(formula1, node)
			this.addSingleExtension(formula2, node)
		}else if(formula.impl){ 
			const formula1 = MPL.negateWff(formula.impl[0])
			const formula2 = new MPL.Wff(MPL._jsonToASCII(formula.impl[1]))
			this.addDoubleExtension(formula1,formula2, node);
		}else if(formula.disj){ 
			const formula1 = new MPL.Wff(MPL._jsonToASCII(formula.disj[0]))
			const formula2 = new MPL.Wff(MPL._jsonToASCII(formula.disj[1]))
			this.addDoubleExtension(formula1,formula2, node);
		}else if(formula.kno_start){  
			const formula1 = new MPL.Wff(MPL._jsonToASCII(formula))
			var term  = new MPL.Wff(MPL._jsonToASCII(formula.kno_start.group_end[1]));
			let n = this.addSingleExtension(term, node)
			const leafs = this.getLeafs(node);
			leafs.forEach(leaf => {
				const branch = this.getBranchFromLeaf(leaf)
				const exts = branch.getSimpleExtensions(node.label)
				if (exts.length === 0){
					return 
				}
				exts.forEach(newLabel =>{
					// RULE K
					var newId = parseInt(leaf.id + '1');
					let newNode = leaf.addSingleChild(newId,term,newLabel);
					// RULE 4
					var newnewId = parseInt(newNode.id + '1');
					let newnewNode = newNode.addSingleChild(newnewId,formula1, newLabel)
					this.addAvailableNode(newNode)
					this.addAvailableNode(newnewNode)
				})
			});
			//REGLA T
		} else if(formula.neg){
			if (formula.neg.kno_start){
				const agents = formula.neg.kno_start.group_end[0].prop.split('');
		  		var term  = formula.neg.kno_start.group_end[1];
				const f1 = MPL.negateWff(term);
				const leafs = this.getLeafs(node);
				leafs.forEach(leaf => {
					const branch = this.getBranchFromLeaf(leaf);
					let labels = branch.getAllLabels().map(x=>x.simplify())
					var count = 1
					var newLabel = node.label.addExtension(agents,count.toString())
					var flag = (labels.includes(newLabel.simplify()) || branch.isSuplerflous(newLabel))
					while (flag){
						count += 1
						newLabel = node.label.addExtension(agents,count.toString())
						flag = branch.isSuplerflous(newLabel);
					}
					// RULE K
					var newId = parseInt(leaf.id + '1');
					let newNode = leaf.addSingleChild(newId,f1, newLabel)
					this.addAvailableNode(newNode);
					this.updateNuGroup();
				})
			}else if(formula.neg.conj){
				const f1 = MPL.negateWff(formula.neg.conj[0]);
				const f2 = MPL.negateWff(formula.neg.conj[1]);
				this.addDoubleExtension(f1,f2, node);
			}else if(formula.neg.disj){
				const f1 = MPL.negateWff(formula.neg.disj[0]);
				const f2 = MPL.negateWff(formula.neg.disj[1]);
				this.addSingleExtension(f1, node)
				this.addSingleExtension(f2, node)
			}else if(formula.neg.impl){
				const f1 = new MPL.Wff(MPL._jsonToASCII(formula.neg.impl[0]));
				const f2 = MPL.negateWff(formula.neg.impl[1]);
				this.addSingleExtension(f1, node)
				this.addSingleExtension(f2, node)
			}else if(formula.neg.neg){
				console.log("Doble negacion")
			}else if(formula.neg.prop){
				console.log("No more rules applied here!")
			}
		}
		let leafs = this.getLeafs();
		
		const b = leafs[0];
		let leafsAva = leafs.filter((leaf) => this.isLeafAvailable(leaf));
		if (leafsAva.length === 0){
			this.alpha_group = []
			this.beta_group = []
			this.nu_group = []
			this.pi_group = []
			return this.getClosedLeafs();
		}else{
			return this.getClosedLeafs();
		}
	}

	getClosedLeafs(){
		let closedLeafs = [];
		let leafs = this.getLeafs();
		leafs.forEach(leaf =>{
			let branch = this.getBranchFromLeaf(leaf);
			if (branch.isClosed()){
				closedLeafs.push(leaf);
			}
		})
		return closedLeafs;
	}

	addSingleExtension(formula, node=this.root, label = node.label){
		const leafs = this.getLeafs(node);
		leafs.forEach(node => {
			var branch = this.getBranchFromLeaf(node)
			var base = label.getBase(branch)
			var flag = base.some(x=> x.unicode() === formula.unicode())
			if (branch.isClosed() | flag){
				return
			}
			var newId = parseInt(node.id + '1');
			const newNode = node.addSingleChild(newId, formula, label);
			this.addAvailableNode(newNode);
		})
	}

	addDoubleExtension(formula1, formula2, node=this.root,label=node.label){
		const leafs = this.getLeafs(node);
		leafs.filter((leaf) => this.isLeafAvailable(leaf))
		leafs.forEach(node => {
			var newId1 = parseInt(node.id + '1');
			var newId2 = parseInt(node.id + '2');
			let [newNode1, newNode2] = node.addTwoChildren(newId1, formula1,  newId2, formula2, label);
			this.addAvailableNode(newNode1)
			this.addAvailableNode(newNode2)
		})
	}
	

	preOrderTraversal(node = this.root){
		if(node === null){
			return
		}
		console.log(node.value.unicode() + ", ")
		this.preOrderTraversal(node.left);
		this.preOrderTraversal(node.right);
	}

	getBranchesFromNode(node){
		let branches = [];
		if (node.left === null) {
			return [this.getBranchFromLeaf(node)]; //devuelve un array con un unico elemento
		}
		let leafs = this.getLeafs(node);
		leafs.forEach( x =>branches.push(this.getBranchFromLeaf(x)));
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

	addAvailableNode(node){
		const type = node.typeOfRule()
		switch (type){
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

	removeAvailableNode(node){
		const type = node.typeOfRule()
		switch (type){
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

	toD3(node = this.root){
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
	updateNuGroup(node = this.root){ 
		if (!node) return;
		if (node.typeOf() === 'kno'){
			const formula = node.value.json();
			const agents = formula.kno_start.group_end[0].prop.split('');
			var termascii  = MPL._jsonToASCII(formula.kno_start.group_end[1]);
			let branches = this.getBranchesFromNode(node);
			let label = node.label;
			branches.forEach(branch => {
				let exts = branch.getSimpleExtensions(label);
				if (exts.length === 0){
					this.nu_group = this.nu_group.filter(item => item !== node)
				}else{
					exts.forEach(extLabel =>{
						let base = extLabel.getBase(branch);
						let ascii = base.map((x) => x.ascii())
						const agentLabel = extLabel.value[extLabel.value.length - 2]
						if (!ascii.includes(termascii) && agents.includes(agentLabel)){
							if (!this.nu_group.some(prevnode => prevnode.id === node.id)){
								this.nu_group.push(node);
							}
						}else{
							this.nu_group = this.nu_group.filter(item => item !== node)
						}
					})
				}
			})
		}
		this.updateNuGroup(node.left);  
		this.updateNuGroup(node.right); 
	}

	isAvailable(data){
		var node = data;
		if (typeof data	 === "string"){
			node = this.getNodeFromId(data)
		}
		var inAlpha = this.alpha_group.some(x => x.id === node.id);
		var inBeta 	= this.beta_group.some(x => x.id === node.id);
		var inNu 	= this.nu_group.some(x => x.id === node.id);
		var inPi 	= this.pi_group.some(x => x.id === node.id);

		return inAlpha || inBeta || inNu || inPi;
	}

	runTableau(logger){
			while (this.alpha_group.length > 0 || this.beta_group.length > 0 || this.pi_group.length > 0 || this.nu_group.length >0 ){
				let leafs = this.getLeafs();
				let leafsAva = leafs.filter((leaf) => this.isLeafAvailable(leaf));
				if (leafsAva.length == 0){
					console.log("NO more leafs open")
					break;
				}else if(this.alpha_group.length > 0 ){
					this.alpha_group.forEach(node =>{
						// logger.addLog(`Applying rule on node ID: ${node.id}, formula: ${node.value.unicode()}`);
						this.applyRule(node, logger);
					})
				}else if(this.nu_group.length > 0 ){
					this.nu_group.forEach(node =>{
						// logger.addLog(`Applying rule on node ID: ${node.id}, formula: ${node.value.unicode()}`);
						this.applyRule(node, logger);
					})
				}else if(this.beta_group.length > 0 ){
					this.beta_group.forEach(node =>{
						// logger.addLog(`Applying rule on node ID: ${node.id}, formula: ${node.value.unicode()}`);
						this.applyRule(node, logger);
					})
				}else if(this.pi_group.length > 0 ){
					this.pi_group.forEach(node =>{
						// logger.addLog(`Applying rule on node ID: ${node.id}, formula: ${node.value.unicode()}`);
						this.applyRule(node, logger);
					})
				}
			}
			logger.addLog(`Tableau ended`);
			console.log(this.isEnded());
			return logger;
		}

	isEnded(){
		const leafs =  this.getLeafs();
		return leafs.every(x => !this.isLeafAvailable(x))
	}

	isClosed(){
		const leafs =  this.getLeafs();
		return leafs.some(leaf =>{
			const branch = this.getBranchFromLeaf(leaf);
			return branch.isClosed()
		})
	}

	isLeafAvailable(leaf){
		const branch = this.getBranchFromLeaf(leaf)
		return !branch.isClosed();
	}

	getNodeFromLeafId(id){
		const searchId = Number(id);
		const leafs = this.getLeafs();
		return leafs.filter(d => Number(d.id) === searchId)[0];
	}

	getNodeFromId(id, node=this.root) {
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
	constructor(labelStr){
		this.value = this._parseLabel(labelStr); // Almacena el string directamente
	}

	_parseLabel(labelStr){
		return labelStr.split('')
	}	

	addExtension(agent, number){
		const newArray = [...this.value, agent, number];
		return new Label(newArray.join(""));
	}

	toString(){
		return this.value.join("")
	}

	equal(label2){
		return this.toString() === label2.toString()
	}

	getBase(branch){
		let baseFormulas = [];
		branch.nodes.forEach(node => {
			if (this.equal(node.label)){
				baseFormulas.push(node.value)
			}

		})	
		return baseFormulas;
	}

	// 1a2b3a4 >> "1234"
	simplify(){
		const simplified = this.value.filter(elemento => !isNaN(Number(elemento)));
		return simplified.join("")
	}

	lenght(){
		return this.value.lenght;
	}


	isSublabel(label){
		let l1 = this
		let l2 = label
		let l1simp = l1.simplify()
		let l2simp = l2.simplify()
		if (label.simplify().length <=this.simplify().length){
			return false
		}else{
			let sub = l2simp.substring(0,l1simp.length);
			return sub === l1simp;
		}
	}


	isSimpleExtension(label){
		let l1 = label
		let l2 = this
		let l1simp = l1.simplify()
		let l2simp = l2.simplify()
		return l1simp.length+1 === l2simp.length  && l1.isSublabel(l2);
	}
}

class Branch {
	constructor() {
		this.nodes = [];
	}

	getLeaf(){
		return this.nodes.reduce((max, currentNode) => {
			return (currentNode.id > max.id) ? currentNode : max;
		});
	}

	addNode(node) {
		this.nodes.push(node);
	}

	isClosed(){
		return this.nodes.some((a, i) => 
			this.nodes.slice(i + 1).some(b => {
				const aLabel = a.label.simplify();
				const bLabel = b.label.simplify();
				const aType = a.typeOf();
				const bType = b.typeOf();
				if ( aLabel === bLabel &&
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

	getAllLabels(){
		let labels = []
		this.nodes.forEach(x=> labels.push(x.label));
		labels = labels.filter((value, index, array) =>  //remove duplicates
			array.indexOf(value) === index
		)
		return labels
	}

	isSuplerflous(label){
		const labelSet = this.getAllLabels()
		var currentBase = label.getBase(this)
		labelSet.some(labelPrima =>{
			let basePrima = labelPrima.getBase(this);
			return currentBase.every(element => basePrima.includes(element))
		})
	}

	getSimpleExtensions(label){
		const labelSet = this.getAllLabels();
		const filtered = labelSet.filter((x) => x.isSimpleExtension(label))
		return filtered;
	}

	getSimpleExtensionsAgent(label, agent){
		const labelSet = this.getAllLabels();
		const filtered = labelSet.filter((x) => x.isSimpleExtension(label))
		return filtered;
	}


}


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

function toD3(node){
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


window.Node = Node;
window.Tableau = Tableau;
window.Branch = Branch;
window.Label = Label;
window.Logger = Logger;
window.toD3 = toD3;



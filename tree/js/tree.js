const MPL = require('../js/MPL.js');
class Tableaux {
  constructor() {
    this.branches = [];
    this.contradictions = new Set();
  }

  // Apply tableaux rules to a formula
  applyRules(formula, isNegated = false) {
    const wff = formula.json()
    
    // Handle double negation
    if (wff.neg !== undefined && wff.neg.neg !== '¬') {
      return this.applyRules(wff.neg.neg, isNegated);
    }
    
	  const actualType = isNegated ? this.negateOperator(wff.type) : wff.type;
    
    switch (actualType) {
      	case 'prop':
        	return [[{ formula: wff, isNegated }]];
		case 'neg':
       		return this.applyRules(wff.children[0], !isNegated);
      	case 'conj': 
			const leftAnd = this.applyRules(wff.children[0], isNegated);
			const rightAnd = this.applyRules(wff.children[1], isNegated);
			return this.combineBranches(leftAnd, rightAnd, false);
		case '¬∧': // Negated AND (NAND) - equivalent to ¬A ∨ ¬B (De Morgan)
			const leftNand = this.applyRules(wff.children[0], !isNegated);
			const rightNand = this.applyRules(wff.children[1], !isNegated);
			return [...leftNand, ...rightNand];
      
      case '¬∨': // Negated OR (NOR) - equivalent to ¬A ∧ ¬B (De Morgan)
        const leftNor = this.applyRules(wff.children[0], !isNegated);
        const rightNor = this.applyRules(wff.children[1], !isNegated);
        return this.combineBranches(leftNor, rightNor, false);
      
      default:
        throw new Error(`Unknown operator: ${wff.type}`);
    }
  }

  // Negate an operator
  negateOperator(op) {
    switch (op) {
      case '∧': return '¬∧';
      case '∨': return '¬∨';
      case '→': return '∧'; // ¬(A → B) is A ∧ ¬B
      case '↔': return '∨'; // ¬(A ↔ B) is (A ∧ ¬B) ∨ (¬A ∧ B)
      default: return op;
    }
  }

  // Combine branches from two subformulas
  combineBranches(left, right, isConjunctive) {
    if (isConjunctive) {
      const combined = [];
      for (const lBranch of left) {
        for (const rBranch of right) {
          combined.push([...lBranch, ...rBranch]);
        }
      }
      return combined;
    } else {
      return [...left, ...right];
    }
  }

  // Check for contradictions in a branch
  checkContradictions(branch) {
    const atoms = new Map();
    
    for (const { formula, isNegated } of branch) {
      if (formula.type === 'atom') {
        const key = formula.value;
        if (atoms.has(key)) {
          if (atoms.get(key) !== isNegated) {
            return true; // Contradiction found
          }
        } else {
          atoms.set(key, isNegated);
        }
      }
    }
    
    return false;
  }

  // Build the tableaux for a formula
  build(formula) {
    const initialBranches = this.applyRules(formula);
    this.branches = initialBranches;
    
    // Check each branch for contradictions
    this.contradictions = new Set();
    this.branches.forEach((branch, i) => {
      if (this.checkContradictions(branch)) {
        this.contradictions.add(i);
      }
    });
    
    return this;
  }

  // Check if the formula is valid (all branches close)
  isValid() {
    return this.branches.length > 0 && 
           this.branches.every((_, i) => this.contradictions.has(i));
  }

  // Check if the formula is satisfiable (at least one open branch)
  isSatisfiable() {
    return this.branches.some((_, i) => !this.contradictions.has(i));
  }

  display() {
    console.log('Tableaux Method Results:');
    console.log('-----------------------');
    
    this.branches.forEach((branch, i) => {
      const status = this.contradictions.has(i) ? 'CLOSED' : 'OPEN';
      console.log(`Branch ${i + 1} (${status}):`);
      
      branch.forEach(({ formula, isNegated }) => {
        const formulaStr = this.formatFormula(formula);
        console.log(`  ${isNegated ? '¬' : ''}${formulaStr}`);
      });
      
      console.log('');
    });
    
    console.log(`Formula is ${this.isValid() ? 'valid' : 'not valid'}`);
    console.log(`Formula is ${this.isSatisfiable() ? 'satisfiable' : 'not satisfiable'}`);
  }

  // Format a formula AST back to string
  formatFormula(node) {
    if (node.type === 'atom') return node.value;
    if (node.type === '¬') return `¬${this.formatFormula(node.children[0])}`;
    
    const left = this.formatFormula(node.children[0]);
    const right = this.formatFormula(node.children[1]);
    
    return `(${left} ${node.type} ${right})`;
  }
}

// Example usage:
const tableaux = new Tableaux();
const formula = "~~p"
const wff = new MPL.Wff(formula);
console.log(wff.json().neg.neg)
// tableaux.build('((P → Q) ∧ P) → Q)'); // Modus ponens - should be valid
// tableaux.display();


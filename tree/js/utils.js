var show = [] //para los botones en el ezmode
var hide = [] //para los botones.

// When the button is clicked.
document.getElementById('readFileButton').addEventListener('click', function() {
    document.getElementById('fileInput').click();
});

document.getElementById('fileInput').addEventListener('change', function(event) {
    const file = event.target.files[0]; // Obtiene el archivo seleccionado

    if (file) {
        const reader = new FileReader();

        reader.onload = function(e) {
			updateModel(e.target.result); //TODO parser
        };

        reader.onerror = function(e) {
            console.error("Error al leer el archivo:", e.target.error);
        };

        reader.readAsText(file);
    } else {
        console.log("No se seleccionó ningún archivo.");
    }
});


function addText(conector, element=null) {
	var text = document.getElementById('formulaInput');

	text.focus();
	if (conector === "delete"){
		text.value = '';
		return;
	}else{
		text.value += conector;
	}
	if (element===null){
		return
	}
	const ezmode = false
	if (ezmode){
		const className = element.className;

		let styleScript = document.getElementById('button-style');
		if (!styleScript) {
			styleScript = document.createElement('style');
			styleScript.id = 'button-style';  
			document.head.appendChild(styleScript);
		}
		styleScript.innerHTML = '';  

		if (className.includes("atom-button")){
			hide = ["atom-button", "monadic-button", "modal-button", "group-button",  "agent-button"]
			show = ["diadic-button"]
		}else if (className.includes("monadic-button")){
			hide = ["diadic-button","agent-button"]
			show = ["monadic-button", "atom-button", "modal-button"]
		}else if (className.includes("modal-button")){
			hide = ["diadic-button"]
			show = ["monadic-button", "atom-button", "modal-button"]
		}else if (className.includes("group-button")){
			hide = ["monadic-button", "atom-button", "modal-button", "group-button",  "diadic-button"]
			show = ["agent-button"]
		}else if (className.includes("agent-button")){
			hide = ["diadic-button"]
			show = ["agent-button", "monadic-button", "atom-button", "modal-button", "group-button"]
		}else if (className.includes("diadic-button")){
			hide = ["diadic-button"]
			show = ["monadic-button", "atom-button", "modal-button"]
		}
		applyStyles(show, hide);
	}
}




// Función para aplicar los estilos (mostrar/ocultar los botones)
function applyStyles(showClasses, hideClasses) {
	console.log("HOLA")
	let styleScript = document.getElementById('button-style');
	console.log(hideClasses)
	hideClasses.forEach(clase => {
		styleScript.innerHTML += `.${clase} { display:none; }`;
	});
	showClasses.forEach(clase => {
		styleScript.innerHTML += `.${clase} { display:inline; }`;
	});
}

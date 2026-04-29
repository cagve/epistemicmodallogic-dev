// function addText(conector, element=null) {
// 	var text = document.getElementById('formulaInput');
//
// 	text.focus();
// 	if (conector === "delete"){
// 		text.value = '';
// 		return;
// 	}else{
// 		text.value += conector;
// 	}
// 	if (element===null){
// 		return
// 	}
// 	const className = element.className;
//
// 	let styleScript = document.getElementById('button-style');
// 	if (!styleScript) {
// 		styleScript = document.createElement('style');
// 		styleScript.id = 'button-style';  // Asigna el id
// 		document.head.appendChild(styleScript);
// 	}
//
// 	switch(className){
// 		case "atom-button":
// 			hide = ["atom-button", "monadic-button", "modal-button", "agent-button"]
// 			show = ["diadic-button"]
// 			break;
// 		case "monadic-button":
// 			hide = ["diadic-button","agent-button"]
// 			show = ["monadic-button", "atom-button", "modal-button"]
// 			break;
// 		case "modal-button":
// 			hide = ["diadic-button"]
// 			show = ["monadic-button", "atom-button", "modal-button"]
// 			break;
// 		case "group-button":
// 			hide = ["monadic-button", "atom-button", "modal-button", "diadic-button"]
// 			show = ["agent-button"]
// 			break;
// 		case "agent-button":
// 			hide = ["diadic-button"]
// 			show = ["agent-button", "monadic-button", "atom-button", "modal-button"]
// 			break;
// 		case "diadic-button":
// 			hide = ["diadic-button"]
// 			show = ["monadic-button", "atom-button", "modal-button"]
// 			break;
// 	}
//
// 	styleScript.innerHTML = '';  // Elimina todas las reglas CSS previas
// 	applyStyles(show, hide);
// }
//
//
//
//
// // Función para aplicar los estilos (mostrar/ocultar los botones)
// function applyStyles(show, hide) {
//   let styleScript = document.getElementById('button-style');
//   hide.forEach(clase => {
//     styleScript.innerHTML += `.${clase} { display:none; }`;
//   });
//   show.forEach(clase => {
//     styleScript.innerHTML += `.${clase} { display:inline; }`;
//   });
// }
//
//
//

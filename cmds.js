const {log, biglog, errorlog, colorize} = require("./out");

const model = require('./model');


/**
 * Muestra la ayuda.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.helpCmd = rl => {
    log("Commandos:");
    log("  h|help - Muestra esta ayuda.");
    log("  list - Listar los quizzes existentes.");
    log("  show <id> - Muestra la pregunta y la respuesta el quiz indicado.");
    log("  add - Añadir un nuevo quiz interactivamente.");
    log("  delete <id> - Borrar el quiz indicado.");
    log("  edit <id> - Editar el quiz indicado.");
    log("  test <id> - Probar el quiz indicado.");
    log("  p|play - Jugar a preguntar aleatoriamente todos los quizzes.");
    log("  credits - Créditos.");
    log("  q|quit - Salir del programa.");
    rl.prompt();
};


/**
 * Lista todos los quizzes existentes en el modelo.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.listCmd = rl => {
    model.getAll().forEach((quiz, id) => {
        log(` [${colorize(id, 'magenta')}]:  ${quiz.question}`);
    });
    rl.prompt();
};


/**
 * Muestra el quiz indicado en el parámetro: la pregunta y la respuesta.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a mostrar.
 */
exports.showCmd = (rl, id) => {
    if (typeof id === "undefined") {
        errorlog(`Falta el parámetro id.`);
    } else {
        try {
            const quiz = model.getByIndex(id);
            log(` [${colorize(id, 'magenta')}]:  ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
        } catch(error) {
            errorlog(error.message);
        }
    }
    rl.prompt();
};


/**
 * Añade un nuevo quiz al módelo.
 * Pregunta interactivamente por la pregunta y por la respuesta.
 *
 * Hay que recordar que el funcionamiento de la funcion rl.question es asíncrono.
 * El prompt hay que sacarlo cuando ya se ha terminado la interacción con el usuario,
 * es decir, la llamada a rl.prompt() se debe hacer en la callback de la segunda
 * llamada a rl.question.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.addCmd = rl => {

    rl.question(colorize(' Introduzca una pregunta: ', 'red'), question => {

        rl.question(colorize(' Introduzca la respuesta ', 'red'), answer => {

            model.add(question, answer);
            log(` ${colorize('Se ha añadido', 'magenta')}: ${question} ${colorize('=>', 'magenta')} ${answer}`);
            rl.prompt();
        });
    });
};


/**
 * Borra un quiz del modelo.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a borrar en el modelo.
 */
exports.deleteCmd = (rl, id) => {
    if (typeof id === "undefined") {
        errorlog(`Falta el parámetro id.`);
    } else {
        try {
            model.deleteByIndex(id);
        } catch(error) {
            errorlog(error.message);
        }
    }
    rl.prompt();
};


/**
 * Edita un quiz del modelo.
 *
 * Hay que recordar que el funcionamiento de la funcion rl.question es asíncrono.
 * El prompt hay que sacarlo cuando ya se ha terminado la interacción con el usuario,
 * es decir, la llamada a rl.prompt() se debe hacer en la callback de la segunda
 * llamada a rl.question.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a editar en el modelo.
 */
exports.editCmd = (rl, id) => {
    if (typeof id === "undefined") {
        errorlog(`Falta el parámetro id.`);
        rl.prompt();
    } else {
        try {
            const quiz = model.getByIndex(id);

            process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)},0);

            rl.question(colorize(' Introduzca una pregunta: ', 'red'), question => {

                process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)},0);

                rl.question(colorize(' Introduzca la respuesta ', 'red'), answer => {
                    model.update(id, question, answer);
                    log(` Se ha cambiado el quiz ${colorize(id, 'magenta')} por: ${question} ${colorize('=>', 'magenta')} ${answer}`);
                    rl.prompt();
                });
            });
        } catch (error) {
            errorlog(error.message);
            rl.prompt();
        }
    }
};


/**
 * Prueba un quiz, es decir, hace una pregunta del modelo a la que debemos contestar.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a probar.
 */


exports.testCmd = (rl,id) =>{
    if(typeof id ==="undefined"){
        errorlog (`Falta el parametro id.`);
        rl.prompt();
    }else{
        try{
            const quiz = model.getByIndex(id);

            rl.question(colorize('¿' +quiz.question + '?','red'), respuesta =>{
                quizResp = quiz.answer.toLowerCase().trim();
                resp = respuesta.toLowerCase().trim();
                if(resp === quizResp){
                    // CORRECTO
                    log("Correcto ");
                    rl.prompt();
                }
                else{
                    //INCORRECTO
                    log("Incorrecto ");
                    rl.prompt();
                }
            });

        } catch(error){
            errorlog(error.message);
            rl.prompt();
        }
    }
};

exports.playCmd = rl =>{
    let score = 0;
    var i;
    //array con todos los ids
    let toBeResolved =[];
    let num_preg = model.count();
    for(i = 0; i<num_preg; i++){
        toBeResolved[i] = i;
    }
    const playOne = () =>{
        if(toBeResolved.length === 0){
            log("Fin");
            log(` No hay más preguntas`);
            log(` Has conseguido : ${score} puntos`);
            biglog(score, 'yellow');
            rl.prompt();
        } else{
            // Elegir una pregunta aleatoria
            let id = Math.round(Math.random()*(toBeResolved.length-1));

            // Hacer la pregunta
            let quiz = model.getByIndex(toBeResolved[id]);
            toBeResolved.splice(id,1);
            rl.question(colorize('¿' +quiz.question + '?','red'), respuesta =>{
                quizResp = quiz.answer.toLowerCase().trim();
                resp = respuesta.toLowerCase().trim();
                if(resp === quizResp){
                    // CORRECTO, CONTINUA
                    score ++;

                    log(` Correcto `);
                    log(`Lleva  ${score}  aciertos`);
                    // HACER UNA NUEVA PREGUNTA
                    if(score == num_preg){
                        biglog('has ganado', 'green');
                    }
                    playOne();
                }
                else{
                    //INCORRECTO, FINAL
                    log("Incorrecto");
                    log("Fin ");
                    log ("Aciertos: ");
                    biglog(`${score}`, 'yellow');
                    rl.prompt();

                }
            });
        }
    }
    playOne();
};

exports.deleteCmd = (rl,id) =>{
    if(typeof id ==="undefined"){
        errorlog (`Falta el parametro id.`);
    }else{
        try{
            model.deleteByIndex(id);
        } catch(error){
            errorlog(error.message);
        }
    }
    rl.prompt();
};

exports.editCmd = (rl,id) =>{
    if(typeof id ==="undefined"){
        errorlog (`Falta el parametro id.`);
    }else{
        try{
            const quiz = model.getByIndex(id);
            process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)},0);
            rl.question(colorize('Introduzca una pregunta: ','red'), question =>{
                process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)},0);
                rl.question(colorize('Introduzca la respuesta: ','red'),answer =>{
                    model.update(id, question, answer);
                    log(`Se ha cambiado la pregunta ${colorize(id,'magenta')} por: ${question} ${colorize('=>', 'magenta')} ${answer}`);
                    rl.prompt();
                });
            });
        } catch(error){
            errorlog(error.message);
            rl.prompt();
        }
    }
};

exports.creditsCmd = (rl)=>{
    log('Autor de la práctica:');
    log('ENRIQUE CUBERO');
    rl.prompt();
};
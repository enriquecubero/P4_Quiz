const {log, biglog, errorlog, colorize} = require("./out");
const Sequelize = require('sequelize');
const {models} = require('./model');


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

    models.quiz.findAll()
        .each(quiz => {
            log(` [${colorize(quiz.id, 'magenta')}]: ${quiz.question}`);
        })

        .catch(error => {
            errorlog(error.message);
        })
        .then(() => {
            rl.prompt();
        });
};

/**
 * Esta función devuelve una promesa que:
 *		- Valida que se ha introducido un valor para el parámetro.
 * 		- Convierte el parámetro en un número entero.
 * Si todo va bien, la promesa se satisface y devuelve el valor del id a usar.
 *
 * @param id Parámetro con el índice a validar.
 */
const validateId = id => {

    return new Sequelize.Promise((resolve, reject) => {             //Devuelve promesas de Sequelize
        if (typeof id === "undefined") {
            reject(new Error(`Falta el parámetro <id>.`));
        } else {
            id = parseInt(id);		// Coge la parte entera y descarta lo demás.
            if (Number.isNaN(id)) {
                reject(new Error(`El valor del parámetro <id> no es un número.`));
            } else {
                resolve(id);
            }
        }
    });
};

/**
 * Muestra el quiz indicado en el parámetro: la pregunta y la respuesta.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a mostrar.
 */
exports.showCmd = (rl, id) => {

    validateId(id)
        .then(id => models.quiz.findById(id))
        .then(quiz => {
            if (!quiz) {
                throw new Error(`No existe un quiz asociado al id = ${id}.`);
            }
            log(` [${colorize(quiz.id, 'magenta')}]: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
        })
        .catch(error => {
            errorlog(error.message);
        })
        .then(() => {
            rl.prompt();
        });
};

/**
 * Esta función convierte la llamada rl.question, que está basada en callbacks, en un función basada en promesas.
 *
 * Esta función devuelve una promesa que cuando se cumple, proporciona el texto introducido.
 *
 * También colorea en rojo el texto de la pregunta, elimina espacios al principio y al final.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param text Pregunta qué hay que hacerle al usuario.
 */
const makeQuestion = (rl, text) => {

    return new Sequelize.Promise((resolve, reject) => {
        rl.question(colorize(text, 'red'), answer => {
            resolve(answer.trim());
        });
    });
};

/**
 * Añade un nuevo quiz al modelo.
 * Pregunta interactivamente por la pregunta y la respuesta.
 *
 * Hay que recordar que el funcionamiento de la función rl.question es asíncrono.
 * El prompt hay que sacarlo cuando  se ha terminado la interacción con el usuario,
 * es decir, la llamada a rl.prompt() se debe hacer en la callback de la segunda
 * llamada a rl.question.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.addCmd = rl => {

    makeQuestion(rl, 'Introduzca una pregunta: ')
        .then(q => {
            return makeQuestion(rl, 'Introduzca la respuesta: ')
                .then(a => {
                    return {question: q, answer: a};
                });
        })
        .then(quiz => {
            return models.quiz.create(quiz);
        })
        .then((quiz) => {
            log(` ${colorize('Se ha añadido', 'magenta')}: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer} `);
        })
        .catch(Sequelize.ValidationError, error => {        //Por si hay un error de validación.
            errorlog('El quiz es erróneo: ');
            error.errors.forEach(({message}) => errorlog(message));
        })
        .catch(error => {                   //Este es cualquier otro tipo de error
            errorlog(error.message);
        })
        .then(() => {                   //Vuelvo a sacar el prompt
            rl.prompt();
        });
};

/**
 * Borra un quiz del modelo.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a borrar en el modelo.
 */
/**
 * Borra un quiz del modelo.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a borrar del modelo.
 */
exports.deleteCmd = (rl, id) => {

    validateId(id)
        .then(id => models.quiz.destroy({where: {id}}))
        .catch(error => {
            errorlog(error.message);
        })
        .then(() => {
            rl.prompt();
        });
};



/**
 * Edita un quiz del modelo.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a editar del modelo.
 */
exports.editCmd = (rl, id) => {
    validateId(id)
        .then(id => models.quiz.findById(id))       //Sacamos la pregunta de la base de datos
        .then(quiz => {
            if(!quiz) {         //Si no existe ese quiz
                throw new Error(`No existe un quiz asociado al id = {id}.`);
            }

            process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)}, 0);
            return makeQuestion(rl, 'Introduzca la pregunta: ')                     //makeQuestion para editar la pregunta
                .then(q => {
                    process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)}, 0);
                    return makeQuestion(rl, 'Introduzca la respuesta: ')        //makeQuestion para editar la respuesta
                        .then(a => {
                            quiz.question = q;          //Cambiamos el valor del atributo, por el nuevo tecto de la pregunta
                            quiz.answer = a;            //Cambiamos el valor del atributo, por el nuevo tecto de la respuesta
                            return quiz;
                        });
                });
        })
        .then(quiz => {
            return quiz.save();                     //recibo el quiz ya cambiado y lo guardo en la base de datos
        })
        .then(quiz => {
            log(` Se ha cambiado el quiz ${colorize(quiz.id, 'magenta')} por:${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer} `);

        })
        .catch(Sequelize.ValidationError, error => {            //Si hay algún valor de validación sacamos el error
            errorlog('El quiz es erróneo: ');
            error.errors.forEach(({message}) => errorlog(message));
        })
        .catch(error => {
            errorlog(error.message);                    //Esto es para cualquier otro tipo de error
        })
        .then(() => {               //finalmente sacamos el prompt
            rl.prompt();
        });
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

exports.creditsCmd = (rl)=>{
    log('Autor de la práctica:');
    log('ENRIQUE CUBERO');
    rl.prompt();
};
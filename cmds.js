const {models}  = require('./model');
const {log, biglog, errorlog, colorize} = require("./out");
const Sequelize = require('sequelize');

/**
 * Muestra la ayuda.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.helpCmd= (socket,rl) => {
    log(socket,"comandos:");
    log(socket,"h|help - muestra esta ayuda.");
    log(socket,"list- listar los quizzes existentes.");
    log(socket,"show <id> - muestra la pregunta y la respuesta del quiz indicado.");
    log(socket,"add - añadir un nuevo quiz interactivamente.");
    log(socket,"delete <id> - Borrar el quiz indicado");
    log(socket,"edit <id> - Editar el quiz indicado");
    log(socket,"test <id> - Probar el quiz indicado");
    log(socket,"p|play - jugar a preguntar aleatoriamente.");
    log(socket,"q|quit - salir del programa.");
    log(socket,"credits - creditos.");
    rl.prompt();
};


/**
 * Lista todos los quizzes existentes en el modelo.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.listCmd= (socket,rl) => {

    models.quiz.findAll()
        .each(quiz => {
            log(socket, `[${colorize(quiz.id, 'magenta')}]: ${quiz.question}`);
        })
        .catch(error => {
            errorlog(socket,error.message);
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
const validateId = id =>{
    return new Sequelize.Promise((resolve, reject) => {
        if (typeof id === "undefined") {
            reject(new Error(`Falta el parametro <id>.`));
        }else {
            id= parseInt(id); //Coger parte entera y descartar lo demás
            if(Number.isNaN(id)){
                reject(new Error(`El valor del parametro <id> no es un número.`));
            }else{
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
exports.showCmd= (socket,rl,id) => {

    validateId(id)
        .then(id => models.quiz.findById(id))
        .then(quiz => {
            if (!quiz) {
                throw new Error(`No existe un quiz asociado al id =${id}.`);
            }
            log(socket,`[${colorize(quiz.id, 'magenta')}]: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
        })
        .catch(error => {
            errorlog(socket,error.message);
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
const makeQuestion =(rl, text) => {
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
exports.addCmd = (socket,rl) => {
    makeQuestion(rl,' Introduzca una pregunta: ')
        .then(q => {
            return makeQuestion(rl, ' Introduzca la respuesta: ')
                .then(a => {
                    return {question: q, answer: a};
                });
        })
        .then(quiz=> {
            return models.quiz.create(quiz);
        })
        .then((quiz) => {
            log(socket,`${colorize('Se ha añadido','magenta')}: ${quiz.question} ${colorize('=>','magenta')} ${quiz.answer}`);
            rl.prompt();
        })
        .catch(Sequelize.ValidationError, error => {
            errorlog(socket,'El quiz es erróneo:');
            error.errors.forEach(({message})=> errorlog(message));
            rl.prompt();
        })
        .catch(error => {
            errorlog(socket,error.message);
        })
        .then(()=> {
            rl.prompt
        });
};


/**
 * Borra un quiz del modelo.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a borrar del modelo.
 */
exports.deleteCmd= (socket,rl,id) => {

    validateId(id)
        .then(id => models.quiz.destroy({where: {id}}))
        .catch(error => {
            errorlog(socket,error.message);
        })
        .then(()=> {
            rl.prompt();
        });
};


/**
 * Edita un quiz del modelo.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a editar del modelo.
 */
exports.editCmd= (socket,rl,id) => {

    validateId(id)
        .then(id => models.quiz.findById(id))
        .then(quiz => {
            if(!quiz) {
                throw new Error()(`No existe un quiz asociado al id=${id}.`);
            }

            process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)}, 0);
            return makeQuestion(rl, 'Introduzca la pregunta: ')
                .then(q=> {
                    process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)}, 0);
                    return makeQuestion(rl, 'Introduzca la respuesta: ')
                        .then(a => {
                            quiz.question =q;
                            quiz.answer = a;
                            return quiz;
                        });
                });
        })
        .then(quiz => {
            return quiz.save();
        })
        .then(quiz => {
            log(socket,`Se ha cambiado el quiz ${colorize(quiz.id, 'magenta')} por: ${quiz.question} ${colorize('=>', ' magenta')} ${quiz.answer}`);
        })
        .catch(Sequelize.ValidationError, error => {
            errorlog(socket,'El quiz es erróneo');
            error.errors.forEach(({message}) => errorlog(message));
        })
        .catch(error=> {
            errorlog(socket,error.message);
        })
        .then(() => {
            rl.prompt();
        });
};


/**
 * Prueba un quiz, es decir, hace na pregunta del modelo a la que debemos contestar.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 * @param id Clave del quiz a probar.
 *
 */
exports.testCmd = (socket, rl, id) => {

    validateId(id)
        .then(id => models.quiz.findById(id))
        .then(quiz => {

            if(!quiz) {

                throw new Error(`No existe un quiz asociado al id = {id}.`);

            }

            return makeQuestion(rl, "¿" + quiz.question + "? ")
                .then(q => {

                    //respCase = resp.toLowerCase().trim();
                    quizAnswerCase =  quiz.answer.toLowerCase().trim();
                    //if (respCase === quizAnswerCase) {

                    if (q.toLowerCase().trim() === quizAnswerCase) {

                        log(socket, `Su respuesta es correcta. `);
                        biglog(socket, 'CORRECTA', 'green');

                    } else {

                        log(socket, `Su respuesta es incorrecta. `);
                        biglog(socket, 'INCORRECTA', 'red');

                    }
                });
        })

        .catch(Sequelize.ValidationError, error => {
            errorlog(socket, 'El quiz es erróneo: ');
            error.errors.forEach(({message}) => errorlog(message));
        })

        .catch(error => {
            errorlog(socket, error.message);
        })

        .then(() => {
            rl.prompt();

        });
};


/**
 * Pregunta todos los quizzes existentes en el modelo en orden aleatorio.
 * Se gana si se contesta a todos satisfactoriamente.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 *
 * Cargar en un array todas las preguntas al principio e ir eliminándolas según se van preguntando.
 *
 */
exports.playCmd = (socket, rl) => {

    let score = 0;
    let toBeResolved = [];

    const playOne = () => {

        return new Promise((resolve, reject) => {

            if (toBeResolved.length == 0) {

                log(socket, `No hay nada más que preguntar. `);
                log(socket, `Fin del juego. Aciertos: ${score} `);
                biglog(socket, score, 'magenta');
                rl.prompt();

            }

            let id = Math.floor(Math.random() * toBeResolved.length);
            const quiz = toBeResolved[id];

            return makeQuestion(rl, "¿" + quiz.question + "? ")
                .then(q => {

                    quizAnswerCase =  quiz.answer.toLowerCase().trim();

                    if (q.toLowerCase().trim() === quizAnswerCase) {
                        score += 1;
                        log(socket, ` CORRECTO - Lleva ${score} aciertos. `);
                        toBeResolved.splice(id,1);
                        playOne();

                    } else {

                        log(socket, ` INCORRECTO. `);
                        log(socket, ` Fin del juego. Aciertos: ${score} `);
                        biglog(socket, score, 'magenta');
                        rl.prompt();

                    }
                })
        })
    }

    models.quiz.findAll({raw: true})
        .then(quiz => {
            toBeResolved = quiz;
        })
        .then(() => {
            return playOne();
        })
        .catch(error => {
            //	errorlog(socket, error.message);
            socket.write(error + "\n");
        })
        .then(() => {
            //biglog(socket, score, 'magenta');
            socket.write(error + "\n");
            rl.prompt();
        })
};


/**
 * Muestra el nombre del autor de la práctica.
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.creditsCmd = (socket, rl) => {

    log(socket, 'Autor de la práctica:');
    log(socket, 'ENRIQUE CUBERo')
    rl.prompt();
};


/**
 * Terminar el programa
 *
 * @param rl Objeto readline usado para implementar el CLI.
 */
exports.quitCmd = (socket, rl) => {

    rl.close();
    socket.end();

};

const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const bodyParser = require('body-parser')
const fs = require('fs');
const translatte = require("translatte");

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

app.use('/Imagens', express.static('Imagens'));
app.use('/CSS', express.static('CSS'));

app.get("/server.js", (req, res) => {
  res.sendStatus(404);
});

app.get("/pessoas", (req, res) => {
  res.sendFile(__dirname + "/pessoas.json");
})

app.get("/pessoas/:email", (req, res) => {
  var pessoas = JSON.parse(fs.readFileSync("pessoas.json").toString());
  var user = pessoas.filter((usuario) => {return usuario.email === req.params.email});
  res.send(user);
})

app.post("/pessoas", (req, res) => {
    var pessoas = JSON.parse(fs.readFileSync("pessoas.json").toString());
    var last_id = pessoas.length + 1;
    var body = req.body;
    var existentes = pessoas.filter(existente => {return existente.email == body.email});
        body.id = last_id;
    if (existentes.length == 0) {
        pessoas.push(body);
        fs.writeFileSync("pessoas.json", JSON.stringify(pessoas));
        res.send({"success": true});
    } else {
      res.send({"success": false, "message": "Já existe alguem usando este email"});
    }
    
})

app.get("/translate", async (req, res) => {
  const target = req.query.target;
  const text = req.query.text;
  await translatte(text, {to: target}).then(result => {
    res.send([result.text]);
  }).catch(err => {
      res.send([text]);
      console.log(err);
  });
});

app.get("/languages", (_, res) => {
  var languages = {
    "pt": "Portuguese",
    "en": "English",
    "fr": "French",
    "es": "Spanish"
  }
  res.send(languages);
});

//inicio de coisas relacionado ao chat

const { v4: uuidv4 } = require('uuid');

// Definindo grupos de chat
const grupos = [];

app.get('/compativeis/:email', (req, res) => {
  var pessoas = JSON.parse(fs.readFileSync("pessoas.json").toString());
  var logged_user = pessoas.filter((usuario) => {return usuario.email === req.params.email})[0];
  var compativeis = pessoas.filter(compativel => compativel.idi_nativo == logged_user.idi_aprender && compativel.idi_aprender == logged_user.idi_nativo);
  res.send(compativeis);
})

// Rota para listar id dos grupos existentes
app.get('/groups', (req, res) => {
  res.send(Object.keys(grupos));
});

// Rota para listar grupos existentes com todas informações (usado para debug)
app.get('/groups/all', (req, res) => {
  res.send(Object.entries(grupos));
});

// Rota para listar usuarios em um grupo
app.get('/groups/:grupo/users', (req, res) => {
  res.send(grupos[req.params.grupo].participantes);
});

// Rota para enviar uma mensagem ao grupo
app.post('/groups/:grupo/messages', (req, res) => {
  const grupo = req.params.grupo;
  console.log(req.body)
  const remetente = req.body.sender;
  const mensagem = req.body.text;

  if (grupo in grupos) {
    grupos[grupo].messages.push({sender: remetente, text: mensagem });
    console.log(`[${grupo}] ${remetente}: ${mensagem}`);
    res.sendStatus(200);
  } else {
    res.status(404).send(`Grupo "${grupo}" não existe.`);
  }
});

// Rota para criar um novo grupo
app.post('/grupo', (req, res) => {
  const participantes = req.body.participantes;

  if (Array.isArray(participantes)) {
    const grupoId = uuidv4();
    grupos[grupoId] = {};
    grupos[grupoId].participantes = participantes;
    grupos[grupoId].messages = [];
    grupos[grupoId].id = grupoId;
    
    res.json({ grupoId });
  } else {
    res.status(400).send('Lista de participantes é necessária.');
  }
});

// Rota para exibir mensagens do grupo
app.get('/groups/:grupo/messages', (req, res) => {
  const grupoId = req.params.grupo;

  if (grupoId in grupos) {
    res.json(grupos[grupoId].messages);
  } else {
    res.status(404).send(`Grupo "${grupoId}" não existe.`);
  }
});

//término de coisas relacionado ao chat

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});
app.get("/:html_page", (req, res) => {
  res.sendFile(__dirname + "/" + req.params.html_page);
});

const port = 3000

server.listen(port, () => {
  console.log("listening on " + port + "\naccess the website via localhost:" + port);
});
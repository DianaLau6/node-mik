const express = require('express');
const bodyParser = require('body-parser');
const RouterOSAPI = require('node-routeros').RouterOSAPI;
const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

// Crear conexión con MikroTik
const conn = new RouterOSAPI({
    host: '192.168.0.100',  // Cambia esto por la IP de tu MikroTik
    user: 'admin',          // Cambia esto por tu usuario
    password: 'rosas',      // Cambia esto por tu contraseña
    port: 8728              // Asegúrate de que el puerto sea el correcto
});

// Conectar y obtener los grupos de usuarios
conn.connect()
    .then(() => {
        console.log('Conectado a MikroTik');
        // Enviar comando para obtener los grupos de usuarios
        return conn.write('/user/group/print');
    })
    .then((groups) => {
        // Mostrar los grupos de usuarios obtenidos
        console.log('Grupos de usuarios en MikroTik:', groups);
        conn.close();
    })
    .catch((err) => {
        console.error('Error al obtener los grupos:', err);
        conn.close();
    });

app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});

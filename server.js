const express = require('express');
const bodyParser = require('body-parser');
const RouterOSAPI = require('node-routeros').RouterOSAPI;
const app = express();
const port = 3000;

// Middleware para parsear el cuerpo de las peticiones como JSON
app.use(bodyParser.json());

// Servir los archivos estáticos (como el HTML)
app.use(express.static('public'));

// Ruta para servir login.html
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/login.html');
});

// Ruta para servir el dashboard.html después de la conexión exitosa
app.get('/dashboard', (req, res) => {
    res.sendFile(__dirname + '/public/dashboard.html');
});

// Ruta para manejar la conexión a MikroTik
app.post('/connect', (req, res) => {
    const { host, user, password } = req.body;

    // Crear la conexión con MikroTik
    const conn = new RouterOSAPI({
        host: host,
        user: user,
        password: password
    });

    // Intentar conectar
    conn.connect()
        .then(() => {
            console.log('Conexión exitosa');
            conn.close(); // Cierra la conexión después de verificar
            res.redirect('/dashboard'); // Redirige al dashboard si la conexión es exitosa
        })
        .catch((err) => {
            console.error('Error al conectar', err);
            res.status(500).send({ message: 'Error al conectar a MikroTik: ' + err.message });
        });
});

app.get('/Ether-ip', (req, res) => {
    res.sendFile(__dirname + '/public/manage-ip.html');
});

app.post('/change-ip', (req, res) => {
    const { comment, address, network, interface } = req.body;

    // Crear la conexión con MikroTik
    const conn = new RouterOSAPI({
        host: '192.168.1.79',  // IP de MikroTik
        user: 'admin',         // Usuario de MikroTik
        password: 'rosas',          // Contraseña de MikroTik
    });

    // Conectar al MikroTik
    conn.connect()
        .then(() => {
            // Primero, verificar si ya existe una IP en la interfaz 'ether2'
            conn.write('/ip/address/print', [
                `?interface=${interface}`
            ])
            .then((existingIPs) => {
                // Si ya existe una IP en ether2, eliminamos la IP actual
                if (existingIPs.length > 0) {
                    const ipId = existingIPs[0]['.id'];
                    console.log(`Eliminando IP actual de ether2: ${existingIPs[0].address}`);
                    conn.write('/ip/address/remove', [
                        `=.id=${ipId}`
                    ])
                    .then(() => {
                        console.log('IP actual eliminada correctamente');
                        // Ahora, agregamos la nueva IP
                        addNewIp(conn, address, network, comment, interface, res);
                    })
                    .catch((err) => {
                        console.error('Error al eliminar la IP actual:', err);
                        conn.close();
                        res.status(500).json({ message: 'Error al eliminar la IP actual' });
                    });
                } else {
                    // Si no hay IP asignada, directamente agregamos la nueva IP
                    addNewIp(conn, address, network, comment, interface, res);
                }
            })
            .catch((err) => {
                console.error('Error al consultar las IPs de la interfaz:', err);
                conn.close();
                res.status(500).json({ message: 'Error al consultar las IPs de la interfaz' });
            });
        })
        .catch((err) => {
            console.error('Error al conectar con MikroTik:', err);
            res.status(500).json({ message: 'Error al conectar con MikroTik' });
        });
});

// Función para agregar la nueva IP
function addNewIp(conn, address, network, comment, interface, res) {
    conn.write('/ip/address/add', [
        `=interface=${interface}`,
        `=address=${address}`,
        `=network=${network}`,
        `=comment=${comment}`
    ])
    .then(() => {
        console.log('Nueva IP agregada correctamente');
        conn.close();
        res.json({ message: 'IP cambiada exitosamente' });
    })
    .catch((err) => {
        console.error('Error al agregar la nueva IP:', err);
        conn.close();
        res.status(500).json({ message: 'Error al agregar la nueva IP' });
    });
}


// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});

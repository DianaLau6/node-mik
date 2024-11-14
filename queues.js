const express = require('express');
const bodyParser = require('body-parser');
const { RouterOSClient } = require('node-routeros');

const app = express();
app.use(bodyParser.json());

// Configura la conexión a MikroTik
const mikrotikClient = new RouterOSClient({
    host: '10.33.27.197', // Cambia a la IP de tu MikroTik
    user: 'admin', // Usuario de MikroTik
    password: 'admin', // Contraseña de MikroTik
    port: 8728 // Puerto API de MikroTik (ajústalo si usas otro)
});

// Ruta para crear la queue
app.post('/create-queue', async (req, res) => {
    const { name, target, dst, max_upload, max_download } = req.body;

    // Validar los datos requeridos
    if (!name || !target || !dst || !max_upload || !max_download) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }

    // Preparar el comando para agregar la queue en MikroTik
    const queueConfig = {
        name: name,
        target: target,
        dst: dst,
        'max-limit': `${max_upload}/${max_download}`, // En formato upload/download
        'burst-limit': '0/0',
        'burst-threshold': '0/0',
        'burst-time': '0s/0s',
        'priority': '8/8',
        'queue': 'default-small/default-small'
    };

    try {
        // Conectar a MikroTik y agregar la queue
        await mikrotikClient.connect();

        const response = await mikrotikClient.write('/queue/simple/add', queueConfig);

        await mikrotikClient.close();

        return res.json({ message: 'Queue creada exitosamente.', response });
    } catch (error) {
        console.error('Error al crear la queue:', error);
        return res.status(500).json({ message: 'Error al crear la queue en MikroTik.' });
    }
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});

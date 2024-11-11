const express = require('express');
const bodyParser = require('body-parser');
const RouterOSAPI = require('node-routeros').RouterOSAPI;
const path = require("path")
const app = express();
const port = 3000;

// Middleware para parsear el cuerpo de las peticiones como JSON
app.use(bodyParser.json());

// Servir los archivos estáticos (como el HTML)
app.use(express.static('public'));
app.use(express.static(path.join(__dirname, "public")));

app.use('/Panel/css', express.static(path.join(__dirname, 'Publics/css'), { 
    setHeaders: (res, path) => { 
        if (path.endsWith('.css')) { res.setHeader('Content-Type', 'text/css'); } } }));

// Ruta para servir login.html
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/login.html');
});

// Ruta para servir el dashboard.html después de la conexión exitosa
app.get('/dashboard', (req, res) => {
    res.sendFile(__dirname + '/public/Tablero.html');
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
    const { comment, address, network, interface, enabled } = req.body;

    // Crear la conexión con MikroTik
    const conn = new RouterOSAPI({
        host: '10.33.26.41',  // IP de MikroTik
        user: 'admin',         // Usuario de MikroTik
        password: 'rosas',     // Contraseña de MikroTik
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
                        addNewIp(conn, address, network, comment, interface, enabled, res);
                    })
                    .catch((err) => {
                        console.error('Error al eliminar la IP actual:', err);
                        conn.close();
                        res.status(500).json({ message: 'Error al eliminar la IP actual' });
                    });
                } else {
                    // Si no hay IP asignada, directamente agregamos la nueva IP
                    addNewIp(conn, address, network, comment, interface, enabled, res);
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

// Función para agregar la nueva IP y activar/desactivar la interfaz
function addNewIp(conn, address, network, comment, interface, enabled, res) {
    conn.write('/ip/address/add', [
        `=interface=${interface}`,
        `=address=${address}`,
        `=network=${network}`,
        `=comment=${comment}`
    ])
    .then(() => {


        // Activar o desactivar la interfaz según el valor de enabled
        const action = enabled ? 'enable' : 'disable';
        conn.write(`/interface/${action}`, [
            `=.id=${interface}`
        ])
        .then(() => {
            conn.close();
        })
    .catch((err) => {
            console.error(`Error al ${enabled ? 'activar' : 'desactivar'} la interfaz:`, err);
            conn.close();

        });
    })
    .catch((err) => {
        conn.close();
    });
}

app.get('/User/Manejo', (req, res) => {
    res.sendFile(__dirname + '/public/Usermanage.html');
});

// Ruta para manejar la conexión y agregar usuario en el User Manager
const ALLOWED_GROUPS = ['read', 'write', 'full']; // Definir los grupos permitidos

// Ruta para manejar la conexión y agregar usuario en el User Manager
app.post('/add-user', (req, res) => {
    const { enabled, comment, name, password, confirm_password, group, allowed_address, inactivity_timeout, inactivity_policy } = req.body;

    // Verificar que la contraseña coincida con la confirmación
    if (password !== confirm_password) {
        return res.status(400).json({ message: 'La contraseña y su confirmación no coinciden' });
    }

    if (!ALLOWED_GROUPS.includes(group.toLowerCase())) {
        return res.status(400).json({ message: 'El grupo ingresado no es válido. Por favor, elige un grupo permitido.' });
    }
    

    // Crear conexión con MikroTik
    const conn = new RouterOSAPI({
        host: '10.33.26.41',  // Cambiar a la IP de tu MikroTik
        user: 'admin',          // Usuario de MikroTik
        password: 'rosas',      // Contraseña de MikroTik
    });

    // Conectar al MikroTik
    conn.connect()
        .then(() => {
            console.log('Conectado a MikroTik');

            // Preparar los parámetros para añadir el usuario
            const params = [
                `=name=${name}`,
                `=password=${password}`,
                `=group=${group}`,
                `=comment=${comment || ''}`,
                `=disabled=${enabled ? 'no' : 'yes'}`, // Si "enabled" es true, usuario activo

                `=inactivity-timeout=${inactivity_timeout || '00:10:00'}`,
                `=inactivity-policy=${inactivity_policy || 'none'}`
            ];

            // Enviar el comando al MikroTik para añadir el usuario
            return conn.write('/user/add', params);
        })
        .then(() => {
            console.log('Usuario agregado correctamente');
            conn.close();
            res.json({ message: 'Usuario agregado exitosamente' });
        })
        .catch((err) => {
            console.error('Error al agregar el usuario:', err);
            conn.close();
            res.status(500).json({ message: 'Error al agregar el usuario en MikroTik: ' + err.message });
        });
});


app.get('/api/interfaces', (req, res) => {
    const conn = new RouterOSAPI({
        host: '10.33.26.41',  // Cambia a la IP de tu MikroTik
        user: 'admin',         // Usuario de MikroTik
        password: 'rosas',     // Contraseña de MikroTik
    });

    conn.connect()
        .then(() => {
            // Consultar todas las interfaces y direcciones IP
            const interfacesPromise = conn.write('/interface/print');
            const ipAddressesPromise = conn.write('/ip/address/print');
            
            return Promise.all([interfacesPromise, ipAddressesPromise]);
        })
        .then(([interfaces, ipAddresses]) => {
            conn.close();
            
            // Mapear las direcciones IP a sus respectivas interfaces
            const interfaceData = interfaces.map(intf => {
                const ipInfo = ipAddresses.find(ip => ip.interface === intf.name) || {};
                return {
                    status: intf.running === 'true' ? 'Activo' : 'Inactivo',
                    address: ipInfo.address || 'N/A',
                    network: ipInfo.network || 'N/A',
                    interface: intf.name,
                    comment: intf.comment || ''
                };
            });

            // Enviar la lista de interfaces al frontend con direcciones IP incluidas
            res.json(interfaceData);
        })
        .catch((err) => {
            console.error('Error al obtener las interfaces o direcciones IP:', err);
            conn.close();
            res.status(500).json({ message: 'Error al obtener las interfaces o direcciones IP' });
        });
});



app.get('/Users', (req, res) => {
    res.sendFile(__dirname + '/public/Users.html');
});

app.get('/user-list', (req, res) => {
    const conn = new RouterOSAPI({
        host: '10.33.26.41',
        user: 'admin',
        password: 'rosas',
    });

    conn.connect()
        .then(() => {
            conn.write('/user/print')
                .then((users) => {
                    conn.close();
                    res.json(users);
                })
                .catch((err) => {
                    console.error('Error al obtener la lista de usuarios:', err);
                    conn.close();
                    res.status(500).json({ message: 'Error al obtener la lista de usuarios' });
                });
        })
        .catch((err) => {
            console.error('Error al conectar con MikroTik:', err);
            res.status(500).json({ message: 'Error al conectar con MikroTik' });
        });
});

app.get('/Tablero', (req, res) => {
    res.sendFile(__dirname + '/public/Tablero.html');
});

app.get('/queues', (req, res) => {
    const conn = new RouterOSAPI({
        host: '10.33.26.41',  // Cambia a la IP de tu MikroTik
        user: 'admin',          // Usuario de MikroTik
        password: 'rosas',      // Contraseña de MikroTik
    });

    conn.connect()
        .then(() => {
            // Consultar las colas simples
            return conn.write('/queue/simple/print');
        })
        .then((queues) => {
            conn.close();
            res.json(queues);  // Enviar las colas al frontend
        })
        .catch((err) => {
            console.error('Error al obtener las colas:', err);
            conn.close();
            res.status(500).json({ message: 'Error al obtener las colas' });
        });
});

//eliminar colas

app.post('/delete-queue', (req, res) => {
    const { queueId } = req.body;  // ID de la cola a eliminar (por ejemplo, "*3")

    const conn = new RouterOSAPI({
        host: '10.33.26.41',  // Cambia a la IP de tu MikroTik
        user: 'admin',          // Usuario de MikroTik
        password: 'rosas',      // Contraseña de MikroTik
    });

    conn.connect()
        .then(() => {
            // Comando para eliminar la cola con el identificador correcto
            return conn.write('/queue/simple/remove', [
                { "=numbers": queueId }  // El identificador de la cola debe ser el que ves en Winbox (*3)
            ]);
        })
        .then(() => {
            conn.close();
            res.json({ message: 'Cola eliminada correctamente' });
        })
        .catch((err) => {
            console.error('Error al eliminar la cola:', err);
            conn.close();
            res.status(500).json({ message: 'Error al eliminar la cola' });
        });
});

app.post('/toggle-queue', (req, res) => {
    const { queueId, action } = req.body;  // Acción y ID de la cola

    const conn = new RouterOSAPI({
        host: '10.33.26.41',  // Cambia a la IP de tu MikroTik
        user: 'admin',          // Usuario de MikroTik
        password: 'rosas',      // Contraseña de MikroTik
    });

    conn.connect()
        .then(() => {
            let command = action === 'enable' ? '/queue/simple/set' : '/queue/simple/remove';
            let params = [
                `=.id=${queueId}`,
                `=disabled=${action === 'disable' ? 'yes' : 'no'}`  // Desactivar o activar
            ];

            return conn.write(command, params);
        })
        .then(() => {
            conn.close();
            res.json({ message: `Cola ${action === 'enable' ? 'activada' : 'desactivada'} correctamente` });
        })
        .catch((err) => {
            console.error('Error al modificar la cola:', err);
            conn.close();
            res.status(500).json({ message: 'Error al modificar la cola' });
        });
});

app.post('/create-queue', (req, res) => {
    const { name, target, dst, max_upload, max_download, burst_upload, burst_download, threshold_upload, threshold_download, time_upload, time_download, time } = req.body;
    
    const conn = new RouterOSAPI({
        host: '10.33.26.41',  // IP de tu MikroTik
        user: 'admin',         // Usuario de MikroTik
        password: 'rosas'      // Contraseña de MikroTik
    });

    conn.connect()
        .then(() => {
            return conn.write('/queue/simple/add', [
                { "=name": name },
                { "=target": target },
                { "=dst": dst || "" },
                { "=max-limit": `${max_upload}/${max_download}` },
                { "=burst-limit": `${burst_upload}/${burst_download}` },
                { "=burst-threshold": `${threshold_upload}/${threshold_download}` },
                { "=burst-time": `${time_upload}/${time_download}` },
                { "=time": time || "" }
            ]);
        })
        .then(() => {
            conn.close();
            res.json({ message: 'Cola creada correctamente' });
        })
        .catch((error) => {
            console.error('Error al crear la cola:', error);
            conn.close();
            res.status(500).json({ message: 'Error al crear la cola' });
        });
});


// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});

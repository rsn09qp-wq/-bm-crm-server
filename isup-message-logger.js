import net from 'net';
import { parseString } from 'xml2js';

const ISUP_PORT = 5200;

console.log('🔍 ISUP Message Logger - Real-time Monitoring');
console.log('='.repeat(80));
console.log(`📡 Listening on port ${ISUP_PORT}`);
console.log(`⏱️  Press Ctrl+C to stop\n`);

let messageCount = 0;

const server = net.createServer((socket) => {
    const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔌 [${new Date().toLocaleTimeString()}] NEW CONNECTION`);
    console.log(`   Client: ${clientId}`);
    console.log(`${'='.repeat(80)}\n`);

    let buffer = '';

    socket.on('data', async (data) => {
        const rawData = data.toString();
        buffer += rawData;

        console.log(`📥 [${new Date().toLocaleTimeString()}] RAW DATA RECEIVED (${rawData.length} bytes)`);
        console.log(`   From: ${clientId}`);
        console.log(`   Data: ${rawData.substring(0, 300)}${rawData.length > 300 ? '...' : ''}\n`);

        // Check if we have complete XML message
        if (buffer.includes('</Message>')) {
            const messages = buffer.split('</Message>');

            for (let i = 0; i < messages.length - 1; i++) {
                const xmlData = messages[i] + '</Message>';
                messageCount++;

                try {
                    parseString(xmlData, { explicitArray: false }, (err, result) => {
                        if (err) {
                            console.error(`❌ XML Parse Error:`, err.message);
                            return;
                        }

                        const message = result.Message;
                        const command = message.Header?.Command;

                        console.log(`\n📨 MESSAGE #${messageCount} - ${command}`);
                        console.log(`${'─'.repeat(80)}`);
                        console.log(`Command: ${command}`);
                        console.log(`Time: ${message.Header?.Time || 'N/A'}`);

                        if (command === 'Register') {
                            console.log(`📋 DEVICE REGISTRATION:`);
                            console.log(`   DeviceID: ${message.Body?.DeviceID || 'N/A'}`);
                            console.log(`   DeviceName: ${message.Body?.DeviceName || 'N/A'}`);

                            // Send response
                            const response = `<?xml version="1.0" encoding="UTF-8"?>
<Message>
  <Header>
    <Version>1.0</Version>
    <Command>Register</Command>
    <Result>OK</Result>
    <Time>${new Date().toISOString()}</Time>
  </Header>
  <Body><ServerID>1</ServerID><KeepAliveInterval>60</KeepAliveInterval></Body>
</Message>`;
                            socket.write(response);
                            console.log(`✅ Sent registration response`);

                        } else if (command === 'Heartbeat') {
                            console.log(`💓 HEARTBEAT received`);

                            const response = `<?xml version="1.0" encoding="UTF-8"?>
<Message>
  <Header>
    <Version>1.0</Version>
    <Command>Heartbeat</Command>
    <Result>OK</Result>
    <Time>${new Date().toISOString()}</Time>
  </Header>
  <Body></Body>
</Message>`;
                            socket.write(response);
                            console.log(`✅ Sent heartbeat response`);

                        } else if (command === 'EventNotification') {
                            console.log(`🎯 ATTENDANCE EVENT:`);
                            console.log(`   Employee No: ${message.Body?.employeeNoString || message.Body?.employeeNo || 'N/A'}`);
                            console.log(`   Time: ${message.Body?.time || 'N/A'}`);
                            console.log(`   Event Type: ${message.Body?.eventType || 'N/A'}`);
                            console.log(`\n   📄 FULL EVENT DATA:`);
                            console.log(JSON.stringify(message.Body, null, 2));

                            const response = `<?xml version="1.0" encoding="UTF-8"?>
<Message>
  <Header>
    <Version>1.0</Version>
    <Command>EventNotification</Command>
    <Result>OK</Result>
    <Time>${new Date().toISOString()}</Time>
  </Header>
  <Body></Body>
</Message>`;
                            socket.write(response);
                            console.log(`✅ Sent event response`);

                        } else {
                            console.log(`⚠️  UNKNOWN COMMAND: ${command}`);
                            console.log(`   Body:`, JSON.stringify(message.Body, null, 2));
                        }

                        console.log(`${'─'.repeat(80)}\n`);
                    });
                } catch (parseError) {
                    console.error(`❌ Parse error:`, parseError.message);
                }
            }

            buffer = messages[messages.length - 1];
        }
    });

    socket.on('end', () => {
        console.log(`\n🔌 [${new Date().toLocaleTimeString()}] Connection closed: ${clientId}\n`);
    });

    socket.on('error', (err) => {
        console.error(`\n❌ [${new Date().toLocaleTimeString()}] Socket error: ${err.message}\n`);
    });
});

server.listen(ISUP_PORT, '0.0.0.0', () => {
    console.log(`✅ Test server started successfully`);
    console.log(`\n💡 Now scan a face on the Hikvision terminal...`);
    console.log(`   All messages will be logged here in real-time.\n`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ ERROR: Port ${ISUP_PORT} is already in use!`);
        console.error(`   The main server is running. Stop it first:\n`);
        console.error(`   1. Go to the terminal running "npm start"`);
        console.error(`   2. Press Ctrl+C to stop it`);
        console.error(`   3. Then run this test again\n`);
    } else {
        console.error(`\n❌ Server error: ${err.message}\n`);
    }
    process.exit(1);
});

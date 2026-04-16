import mqtt from "mqtt";

let client = null; // Persists across requests in the same server process
function getClient() {
  if (client) return client; // Already connected — reuse it

  client = mqtt.connect(process.env.MQTT_BROKER_URL, {
    port: process.env.MQTT_PORT,
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    reconnectPeriod: 5000, // Auto-reconnect every 5s if connection drops
    connectTimeout: 10_000, // Give up connecting after 10s
    clean: true, // Don't resume a previous session
    ca: process.env.MQTT_CA_CERTIFICATE                                                                                                                                 
    ? Buffer.from(process.env.MQTT_CA_CERTIFICATE, 'base64')                                                                                                          
    : undefined,      
    rejectUnauthorized: true,
  });

  client.on("connect", () => console.log("MQTT connected"));
  client.on("error", (err) => console.error("MQTT error:", err));
  client.on("close", () => console.warn("MQTT connection closed"));
  client.on("reconnect", () => console.log("MQTT reconnecting..."));

  return client;
}

export function publish(topic, payload, qos = 1) {
  return new Promise((resolve, reject) => {
    const c = getClient();

    const message =
      typeof payload === "string" ? payload : JSON.stringify(payload); // Auto-serialize objects

    c.publish(topic, message, { qos, retain: false }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

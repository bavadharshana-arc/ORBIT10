import { createApp } from "./app";

const PORT = 5000;

const app = createApp();

app.listen(PORT, () => {
  console.log(`ORBIT server running on http://localhost:${PORT}`);
});

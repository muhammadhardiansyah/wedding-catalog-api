import app from './app.js';

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Wedding Catalog API server running at http://127.0.0.1:${PORT}`);
});

import app from './app.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`[RecoverAI] Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

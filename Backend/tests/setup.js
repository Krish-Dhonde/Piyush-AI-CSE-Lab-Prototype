// Test setup: ensure test environment variables are loaded
process.env.NODE_ENV = 'test';
process.env.PORT = '5001';
process.env.HOST = '127.0.0.1';
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/virtual_cse_lab_test';
process.env.CORS_ORIGIN = 'http://localhost:3000,http://localhost:5173';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_MAX = '1000';
process.env.LOG_LEVEL = 'silent'; // keep test output clean

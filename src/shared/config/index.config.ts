export const appConfig = () => ({
  port: Number(process.env.PORT || 3010),
  appName: process.env.APP_NAME || 'auth',
  appLink: process.env.APP_LINK || 'http://localhost:3010',
});

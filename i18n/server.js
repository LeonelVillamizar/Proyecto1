import { app } from "./app";
// app.set('port', process.env.PORT || 2000);

// //Starting server
// app.listen(app.get('port'), () => {
//     console.log('Server on port', app.get('port'))
// });


app.listen(process.env.PORT);
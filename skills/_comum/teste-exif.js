// Leitor de EXIF (data/hora e GPS) e coordenadas — usado pelo relatório
// fotográfico dos laudos para conferir local e data das fotos.
const { verificador } = require('./teste');
const { lerExif, coordenadas, distanciaM } = require('./exif');
const { jpegTeste } = require('./foto-teste');

const v = verificador('exif (data/hora e GPS das fotos)');

const exif = lerExif(jpegTeste({ dataHora: '2026-10-27T10:08:52', lat: -15.651788, lon: -47.782726 }));
v.igual('data/hora original', exif.data_hora, '2026-10-27T10:08:52');
v.perto('latitude (sul negativa)', exif.gps.lat, -15.651788, 1e-6);
v.perto('longitude (oeste negativa)', exif.gps.lon, -47.782726, 1e-6);
const norte = lerExif(jpegTeste({ dataHora: '2026-01-02T03:04:05', lat: 40.4168, lon: 3.7038 }));
v.igual('hemisférios norte/leste positivos', [norte.gps.lat > 0, norte.gps.lon > 0], [true, true]);
v.igual('JPEG sem EXIF', lerExif(jpegTeste()), { data_hora: null, gps: null });
v.igual('não JPEG', lerExif(Buffer.from('nada')), { data_hora: null, gps: null });
v.igual('JPEG cortado não quebra', lerExif(jpegTeste({ dataHora: '2026-10-27T10:08:52', lat: 1, lon: 1 }).slice(0, 40)), { data_hora: null, gps: null });

v.igual('coordenadas em texto', coordenadas('-15.652004, -47.783291'), { lat: -15.652004, lon: -47.783291 });
v.igual('coordenadas com vírgula decimal', coordenadas('-15,652004; -47,783291'), { lat: -15.652004, lon: -47.783291 });
v.igual('coordenadas em objeto', coordenadas({ lat: '-15.6', lon: '-47.7' }), { lat: -15.6, lon: -47.7 });
v.igual('coordenadas inválidas', [coordenadas('abc'), coordenadas('95, 10'), coordenadas('')], [null, null, null]);
// dois pontos do DF a ~40 km um do outro; o mesmo ponto: 0
v.perto('distância entre dois pontos', distanciaM({ lat: -15.652, lon: -47.7833 }, { lat: -15.8653, lon: -48.0771 }) / 1000, 39.6, 0.02);
v.igual('distância nula', distanciaM({ lat: -15.6, lon: -47.7 }, { lat: -15.6, lon: -47.7 }), 0);

v.fim();

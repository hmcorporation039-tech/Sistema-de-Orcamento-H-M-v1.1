// Climatização no CAD e no 3D — os tipos de ponto HVAC, as layers, as formas do 3D, os símbolos de
// planta e a planta automática moraram aqui até a 2.40; passaram para skills/_comum/cad/climatizacao.js
// porque o CAD comum (modelo3d.js, simbolos.js, plantasDisciplina.js) dependia desta skill — o _comum
// não pode depender de uma disciplina. Este arquivo só reexporta, para quem usa o caminho antigo.
module.exports = require('../../../_comum/cad/climatizacao');

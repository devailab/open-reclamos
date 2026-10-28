package utils

import "time"

// LimaZone es la zona horaria de negocio para fechas visibles y filtros por día.
var LimaZone = time.FixedZone("America/Lima", -5*60*60)

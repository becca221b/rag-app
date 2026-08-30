# Business Rules - RAG Application

## Gestión de Usuarios y Autenticación

### BR-001: Unicidad de Email
Cada usuario debe tener un correo electrónico único en el sistema. No se permite el registro de múltiples cuentas con el mismo email.

### BR-002: Autenticación Requerida
Todas las operaciones de la aplicación (upload de documentos, consultas RAG, gestión de sesiones) requieren autenticación previa del usuario mediante credenciales válidas.

### BR-003: Expiración de Sesión
Las sesiones de usuario tienen una validez máxima de 7 días. Después de este período, el usuario debe autenticarse nuevamente para continuar utilizando la aplicación.

### BR-004: Aislamiento de Datos por Usuario
Cada usuario solo puede acceder a sus propios documentos, sesiones de chat y resultados de búsqueda. No existe visibilidad cruzada entre usuarios bajo ninguna circunstancia.

### BR-005: Eliminación en Cascada de Datos de Usuario
Cuando un usuario es eliminado, todos sus documentos, chunks, sesiones de chat y mensajes asociados deben ser eliminados automáticamente del sistema.

## Gestión de Documentos

### BR-006: Formato de Documentos
El sistema solo acepta archivos en formato PDF para su procesamiento e indexado. No se aceptan otros formatos de documento (TXT, DOC, DOCX, etc.).

### BR-007: Validación de Content Type
Los archivos cargados deben cumplir con el content type "application/pdf" o tener extensión .pdf para ser aceptados por el sistema.

### BR-008: Límite de Archivos por Upload
El sistema permite cargar máximo 10 archivos PDF en una sola operación de upload. Intentos de cargar más archivos deben ser rechazados.

### BR-009: Validación de Archivos Vacíos
No se permite la carga de archivos vacíos o sin contenido. Todo archivo debe tener un tamaño mayor a cero bytes.

### BR-010: Estados de Documentos
Todo documento pasa por los siguientes estados durante su ciclo de vida:
- UPLOADED: Documento cargado en S3, pendiente de procesamiento
- INDEXING: Documento en proceso de chunking, embeddings e indexado
- INDEXED: Documento completamente procesado y disponible para consultas
- ERROR: Documento que falló en alguna etapa del procesamiento

### BR-011: Indexado Automático
Todo documento cargado debe ser procesado automáticamente para su indexado. Este proceso debe iniciarse inmediatamente después de la carga completa del archivo.

### BR-012: Indexado No Bloqueante
El proceso de indexado de documentos debe ejecutarse en segundo plano sin bloquear la respuesta al usuario. El usuario debe recibir confirmación inmediata de la carga mientras el indexado continúa asíncronamente.

### BR-013: Actualización de Estado en Errores
Si el proceso de indexado falla en cualquier etapa, el estado del documento debe actualizarse a ERROR con un mensaje descriptivo del problema encountered.

### BR-014: Eliminación de Documentos
Los usuarios pueden eliminar sus propios documentos en cualquier momento. Esta acción debe eliminar el documento de la base de datos, sus chunks asociados del índice vectorial, y el archivo físico de S3.

### BR-015: Propiedad de Documentos
Un documento pertenece exclusivamente al usuario que lo cargó. Solo el propietario puede eliminar, consultar o modificar el documento.

## Pipeline de Procesamiento RAG

### BR-016: Extracción de Texto
Todo documento PDF debe ser procesado para extraer su contenido textual antes de ser chunking y procesado para embeddings.

### BR-017: Tamaño de Chunks
El texto de los documentos debe dividirse en chunks de máximo 800 caracteres de longitud.

### BR-018: Overlap entre Chunks
Debe existir un overlap de 150 caracteres entre chunks consecutivos para preservar el contexto semántico y evitar pérdida de información en los límites.

### BR-019: División por Oraciones
La división en chunks debe priorizar cortes en límites de oraciones para mantener la coherencia semántica del contenido.

### BR-020: Generación de Embeddings
Cada chunk de texto debe ser convertido a un vector de embeddings utilizando el modelo Amazon Titan Embeddings.

### BR-021: Dimensión de Embeddings
Los embeddings generados deben tener una dimensión de 1536 valores numéricos.

### BR-022: Indexado Vectorial
Todos los chunks con sus embeddings deben ser indexados en OpenSearch Serverless utilizando búsqueda vectorial k-NN.

### BR-023: Filtrado por Usuario en Indexado
Todo chunk indexado debe estar asociado al ID del usuario propietario del documento original para garantizar el aislamiento de datos.

## Pipeline de Consulta RAG

### BR-024: Consultas en Lenguaje Natural
El sistema debe aceptar consultas formuladas en lenguaje natural por parte del usuario.

### BR-025: Generación de Embedding de Consulta
Toda consulta del usuario debe ser convertida a un embedding utilizando el mismo modelo utilizado para los chunks (Amazon Titan Embeddings).

### BR-026: Búsqueda de Top-K Chunks
El sistema debe recuperar los 5 chunks más relevantes (top-k=5) basándose en similitud vectorial con la consulta del usuario.

### BR-027: Filtrado por Usuario en Búsqueda
La búsqueda vectorial debe filtrar resultados para incluir solo chunks pertenecientes al usuario que realiza la consulta.

### BR-028: Contexto para Generación
Los chunks recuperados deben ser compilados en un contexto textual para ser proporcionados al modelo de generación.

### BR-029: Respuestas Basadas Exclusivamente en Contexto
El modelo de generación debe responder utilizando únicamente la información proporcionada en el contexto de los chunks recuperados. No se permite el uso de conocimiento externo o invención de información.

### BR-030: Respuesta Cuando No Hay Contexto
Si no se encuentran chunks relevantes para una consulta, el sistema debe informar explícitamente que no se encontró información relevante en los documentos cargados.

### BR-031: Citación de Fuentes
Toda respuesta generada debe incluir referencias a las fuentes utilizadas, especificando documento, página y chunk de donde proviene la información.

### BR-032: Validación de Respuestas Vacías
El sistema debe validar que las respuestas generadas no estén vacías. Si el modelo retorna una respuesta vacía, debe considerarse un error y generarse una respuesta de fallback.

### BR-033: Límite de Tokens en Respuestas
Las respuestas generadas deben tener un máximo de 1000 tokens para mantener la concisión y relevancia de la información.

## Gestión de Chat y Sesiones

### BR-034: Creación de Sesiones
Los usuarios pueden crear sesiones de chat para organizar sus consultas y mantener el historial de conversaciones.

### BR-035: Creación Automática de Sesión
Si un usuario realiza una consulta sin especificar una sesión existente, el sistema debe crear automáticamente una nueva sesión.

### BR-036: Título de Sesión
El título de una sesión debe generarse automáticamente basándose en la primera consulta realizada en dicha sesión (máximo 50 caracteres).

### BR-037: Persistencia de Mensajes
Todos los mensajes de una sesión (tanto del usuario como del asistente) deben persistir en la base de datos con su rol, contenido y fuentes asociadas.

### BR-038: Roles de Mensajes
Los mensajes en una sesión pueden tener únicamente dos roles: USER (mensajes del usuario) o ASSISTANT (respuestas del sistema).

### BR-039: Almacenamiento de Fuentes
Los mensajes del asistente deben almacenar las fuentes utilizadas para generar la respuesta, incluyendo información de chunks, documentos, páginas y scores de relevancia.

### BR-040: Listado de Sesiones
Los usuarios deben poder listar todas sus sesiones de chat ordenadas por fecha de actualización descendente.

### BR-041: Recuperación de Sesión Completa
Al cargar una sesión existente, el sistema debe recuperar todos los mensajes asociados en orden cronológico ascendente.

### BR-042: Propiedad de Sesiones
Las sesiones de chat pertenecen exclusivamente al usuario que las creó. Un usuario no puede acceder a sesiones de otro usuario.

### BR-043: Actualización de Timestamp de Sesión
El timestamp de actualización de una sesión debe actualizarse cada vez que se agrega un nuevo mensaje a la sesión.

## Performance y Confiabilidad

### BR-044: Retry Logic en Operaciones Críticas
Las operaciones críticas (especialmente las de OpenSearch) deben implementar lógica de reintentos con exponential backoff.

### BR-045: Máximo de Reintentos
El sistema debe realizar máximo 3 reintentos para operaciones fallidas antes de declarar un error definitivo.

### BR-046: Exponential Backoff
El tiempo de espera entre reintentos debe seguir un patrón de exponential backoff: 2^attempt * 1000ms.

### BR-047: Procesamiento Asíncrono de Chunks
El procesamiento de chunks (embeddings e indexado) debe realizarse de manera asíncrona para no bloquear la experiencia del usuario.

### BR-048: Actualización en Tiempo Real
El frontend debe actualizar la información de documentos y sesiones en tiempo real mediante polling automático.

### BR-049: Intervalos de Polling
El sistema debe realizar polling cada 10 segundos para actualizar el estado de documentos y cada 15 segundos para actualizar las sesiones de chat.

## Restricciones de Seguridad

### BR-050: Encriptación de Contraseñas
Todas las contraseñas de usuario deben ser encriptadas utilizando bcrypt antes de ser almacenadas en la base de datos.

### BR-051: Tokens JWT
La autenticación debe implementarse utilizando tokens JWT que deben incluirse en el header Authorization de todas las requests protegidas.

### BR-052: Guards en Endpoints Protegidos
Todos los endpoints que requieren autenticación deben implementar guards para validar la presencia y validez del token JWT.

### BR-053: Validación de Inputs
Todos los inputs de usuario deben ser validados antes de ser procesados para prevenir inyección de código o ataques de seguridad.

### BR-054: Variables de Entorno para Secrets
Todas las credenciales y secrets (AWS keys, database URLs, JWT secrets) deben ser almacenados en variables de entorno y nunca hardcodeados en el código fuente.

## Casos Borde

### BR-055: Documento Corrupto
Si un archivo PDF está corrupto y no puede ser procesado, el documento debe marcarse con estado ERROR y el usuario debe ser notificado del problema.

### BR-056: Documento Sin Texto Extraíble
Si un PDF no contiene texto extraíble (ej. imágenes escaneadas sin OCR), el proceso debe manejar el caso marcando el documento con estado ERROR apropiado.

### BR-057: Consulta Muy Larga
Si una consulta del usuario excede los límites razonables de longitud, el sistema debe rechazarla o truncarla apropiadamente.

### BR-058: Usuario Sin Documentos
Si un usuario intenta realizar una consulta RAG sin tener documentos indexados, el sistema debe informar que no hay información disponible para responder.

### BR-059: OpenSearch No Disponible
Si el servicio de OpenSearch no está disponible, el sistema debe implementar la lógica de retry y eventualmente informar del error al usuario si persiste.

### BR-060: Bedrock No Disponible
Si el servicio de Bedrock no está disponible para generación de embeddings o respuestas, el sistema debe implementar retry logic y eventualmente informar del error.

### BR-061: S3 Upload Fallido
Si el upload a S3 falla, el documento no debe ser creado en la base de datos y el usuario debe ser informado del error.

### BR-062: Sesión No Encontrada
Si un usuario intenta acceder a una sesión que no existe o no le pertenece, el sistema debe retornar un error 404 Not Found.

### BR-063: Chunking de Texto Muy Corto
Si un documento tiene muy poco texto (menos de 800 caracteres), debe generarse un único chunk con todo el contenido disponible.

### BR-064: Embeddings Generation Fallido
Si la generación de embeddings falla para algún chunk, el proceso de indexado debe marcarse como ERROR y el documento debe quedar en estado ERROR.

### BR-065: Generación de Respuesta Fallida
Si la generación de respuesta por parte del modelo falla, el sistema debe retornar un mensaje de error genérico al usuario sin exponer detalles técnicos.

## Reglas Implícitas Necesarias

### BR-066: Consistencia de Estados
Los estados de los documentos deben ser consistentes en todo momento. No debe existir un documento en estado INDEXED sin tener sus chunks correspondientes indexados.

### BR-067: Integridad Referencial
No deben existir chunks huérfanos (sin documento asociado) ni mensajes huérfanos (sin sesión asociada) en la base de datos.

### BR-068: Ordenamiento de Chunks
Los chunks deben mantener su orden original basándose en el chunkIndex para preservar la secuencia lógica del documento.

### BR-069: Unicidad de S3 Keys
Las claves de S3 deben ser únicas para evitar colisiones. Esto se logra incluyendo el userId y timestamp en el patrón de naming.

### BR-070: Preservación de Metadata
Al eliminar un documento, se debe preservar la información de error si existía, para propósitos de auditoría y troubleshooting.

### BR-071: Non-Repudiation
Los mensajes de chat deben incluir timestamps de creación para establecer el orden cronológico y permitir auditoría de conversaciones.

### BR-072: Idempotencia de Operaciones
Las operaciones de upload y eliminación deben ser idempotentes cuando sea posible para evitar efectos secundarios en reintentos.

### BR-073: Validación de Formato de Email
El sistema debe validar que el email proporcionado durante el registro cumpla con un formato válido de dirección de correo electrónico.

### BR-074: Longitud Mínima de Password
Las contraseñas deben tener una longitud mínima para garantizar seguridad básica (regla implícita de seguridad estándar).

### BR-075: Sanitización de Nombres de Archivos
Los nombres de archivos originales deben ser sanitizados para prevenir ataques de path traversal o inyección de comandos.

### BR-076: Límite de Tamaño de Archivo
Aunque no especificado explícitamente, debe existir un límite razonable de tamaño de archivo para prevenir abuso del sistema y agotamiento de recursos.

### BR-077: Rate Limiting Implícito
Aunque no implementado actualmente, el sistema debe tener capacidad para implementar rate limiting por usuario para prevenir abuso de los servicios de AWS.

### BR-078: Timezone Consistency
Todos los timestamps deben ser almacenados en UTC y convertidos al timezone del usuario solo para display, garantizando consistencia temporal.

### BR-079: Soft Delete Consideration
Aunque actualmente se usa hard delete, se debe considerar la posibilidad de implementar soft delete para auditoría y recuperación de datos.

### BR-080: Logging de Operaciones Críticas
Todas las operaciones críticas (upload, indexado, consultas) deben ser logged apropiadamente para troubleshooting y auditoría.

---

**Nota:** Este documento de reglas de negocio ha sido derivado exclusivamente del Product Brief del proyecto RAG Application. Las reglas están organizadas por áreas funcionales y cada una tiene un identificador único (BR-XXX) para referencia cruzada y trazabilidad.
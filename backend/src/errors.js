export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    Object.assign(this, { status, code, details });
  }
}

export function handleErrors(logger) {
  return (error, request, response, next) => {
    if (response.headersSent) return next(error);
    let failure = error;
    if (error.type === 'entity.parse.failed') failure = new HttpError(400, 'INVALID_JSON', 'Send a valid JSON object.');
    if (error.type === 'entity.too.large') failure = new HttpError(413, 'BODY_TOO_LARGE', 'JSON bodies may not exceed 32 KiB.');
    if (error.code === 'LIMIT_FILE_SIZE') failure = new HttpError(413, 'PHOTO_TOO_LARGE', 'Photos may not exceed 5 MiB.');
    else if (error.name === 'MulterError' || ['Unexpected end of form', 'Multipart: Boundary not found'].includes(error.message)) {
      failure = new HttpError(400, 'INVALID_UPLOAD', 'Send one photo file and no extra multipart fields.');
    }
    if (['encoding.unsupported', 'charset.unsupported'].includes(error.type)) failure = new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Unsupported request encoding.');
    if (!(failure instanceof HttpError)) {
      logger.error({ event: 'request_failed', requestId: request.id });
      failure = new HttpError(500, 'INTERNAL_ERROR', 'The request could not be completed.');
    }
    if (failure.status === 401) response.set('WWW-Authenticate', 'Bearer');
    response.status(failure.status).json({ error: {
      code: failure.code, message: failure.message, requestId: request.id,
      ...(failure.details ? { details: failure.details } : {})
    } });
  };
}

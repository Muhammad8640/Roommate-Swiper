export function compatibilityController(service) {
  return {
    read: async (request, response) =>
      response.json({ data: await service.between(request.identity, request.params.userId) })
  };
}
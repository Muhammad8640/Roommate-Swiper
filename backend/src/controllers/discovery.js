export function discoveryController(service) {
  return {
    list: async (request, response) => response.json({
      data: await service.list(request.identity, request.query)
    })
  };
}

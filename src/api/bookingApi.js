import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';

const bookingRestClient = createAxiosClient({
  baseURL: '/api/entities',
  headers: {
    'X-App-Id': appParams.appId,
  },
  token: appParams.token,
  interceptResponses: true,
});

export const bookingApi = {
  list: (sortBy) => base44.entities.Booking.list(sortBy),
  filter: (query, sortBy) => base44.entities.Booking.filter(query, sortBy),
  getById: (bookingId) => base44.entities.Booking.get(bookingId),
  create: (data) => base44.entities.Booking.create(data),
  update: (bookingId, data) => base44.entities.Booking.update(bookingId, data),
  delete: (bookingId) => base44.entities.Booking.delete(bookingId),
  restore: (bookingId) => base44.entities.Booking.restore(bookingId),
  deleteMany: (query) => base44.entities.Booking.deleteMany(query),
  bulkCreate: (records) => base44.entities.Booking.bulkCreate(records),
  bulkUpdate: (payload) => bookingRestClient.put('/Booking/bulk', payload),
  updateMany: (payload) => bookingRestClient.patch('/Booking/update-many', payload),
};

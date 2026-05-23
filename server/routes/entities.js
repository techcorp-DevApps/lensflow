import { z } from 'zod';
import { createEntityRouter } from './entity-factory.js';

const SESSION_TYPES = ['portrait', 'wedding', 'family', 'newborn', 'maternity', 'event', 'commercial', 'headshot'];
const BOOKING_STATUS = ['pending', 'confirmed', 'contract_sent', 'contract_signed', 'completed', 'cancelled'];
const CONTRACT_TYPES = ['service_contract', 'model_release', 'liability_waiver', 'print_release'];
const CONTRACT_STATUS = ['draft', 'sent', 'viewed', 'signed'];
const GALLERY_STATUS = ['preparing', 'published', 'archived'];

const optionalNullable = (s) => s.optional().nullable();
/** @type {<T extends string>(arr: readonly T[]) => [T, ...T[]]} */
const tup = (arr) => /** @type {[any, ...any[]]} */ ([...arr]);

// Bookings: public create (booking request form) + public list/get by access_token
export const bookingsRouter = createEntityRouter({
  table: 'bookings',
  columns: [
    'id', 'client_name', 'client_email', 'client_phone', 'session_type',
    'session_date', 'location', 'notes', 'status', 'price', 'deposit_paid',
    'reminder_sent', 'gallery_id', 'access_token', 'created_date', 'updated_date', 'created_by'
  ],
  writable: [
    'client_name', 'client_email', 'client_phone', 'session_type', 'session_date',
    'location', 'notes', 'status', 'price', 'deposit_paid', 'reminder_sent',
    'gallery_id', 'access_token'
  ],
  // Clients may create a booking request and read/filter by their access_token
  publicOps: ['create', 'list', 'get'],
  publicFilterKeys: ['id', 'access_token'],
  schema: z.object({
    client_name: z.string().min(1),
    client_email: z.string().email(),
    client_phone: optionalNullable(z.string()),
    session_type: z.enum(tup(SESSION_TYPES)),
    session_date: z.string(),
    location: optionalNullable(z.string()),
    notes: optionalNullable(z.string()),
    status: z.enum(tup(BOOKING_STATUS)).optional(),
    price: optionalNullable(z.number()),
    deposit_paid: z.boolean().optional(),
    reminder_sent: z.boolean().optional(),
    gallery_id: optionalNullable(z.string()),
    access_token: optionalNullable(z.string()),
  }),
});

// Contracts: public get + update (contract signing flow). Restrict public writes to signing fields only.
export const contractsRouter = createEntityRouter({
  table: 'contracts',
  columns: [
    'id', 'booking_id', 'type', 'client_name', 'client_email', 'content',
    'status', 'signature', 'signed_date', 'ip_address', 'created_date', 'updated_date', 'created_by'
  ],
  writable: [
    'booking_id', 'type', 'client_name', 'client_email', 'content',
    'status', 'signature', 'signed_date', 'ip_address'
  ],
  publicOps: ['get', 'updateOne', 'list'],
  publicFilterKeys: ['id', 'booking_id'],
  // Unauthenticated updates only allow signing fields
  publicWritable: ['signature', 'signed_date', 'status'],
  schema: z.object({
    booking_id: z.string().min(1),
    type: z.enum(tup(CONTRACT_TYPES)),
    client_name: z.string().min(1),
    client_email: z.string().email(),
    content: optionalNullable(z.string()),
    status: z.enum(tup(CONTRACT_STATUS)).optional(),
    signature: optionalNullable(z.string()),
    signed_date: optionalNullable(z.string()),
    ip_address: optionalNullable(z.string()),
  }),
});

// Galleries: public list/get (client gallery password entry and view)
export const galleriesRouter = createEntityRouter({
  table: 'galleries',
  columns: [
    'id', 'title', 'booking_id', 'client_name', 'client_email', 'password',
    'cover_image_url', 'status', 'selections_enabled', 'download_enabled',
    'expiry_date', 'created_date', 'updated_date', 'created_by'
  ],
  writable: [
    'title', 'booking_id', 'client_name', 'client_email', 'password',
    'cover_image_url', 'status', 'selections_enabled', 'download_enabled', 'expiry_date'
  ],
  publicOps: ['get', 'list'],
  publicFilterKeys: ['id', 'booking_id'],
  schema: z.object({
    title: z.string().min(1),
    booking_id: optionalNullable(z.string()),
    client_name: optionalNullable(z.string()),
    client_email: optionalNullable(z.string()),
    password: z.string().min(1),
    cover_image_url: optionalNullable(z.string()),
    status: z.enum(tup(GALLERY_STATUS)).optional(),
    selections_enabled: z.boolean().optional(),
    download_enabled: z.boolean().optional(),
    expiry_date: optionalNullable(z.string()),
  }),
});

// Gallery images: public list/get/updateOne (client image selection toggle)
export const galleryImagesRouter = createEntityRouter({
  table: 'gallery_images',
  columns: [
    'id', 'gallery_id', 'image_url', 'thumbnail_url', 'filename',
    'selected', 'order', 'created_date', 'updated_date', 'created_by'
  ],
  writable: ['gallery_id', 'image_url', 'thumbnail_url', 'filename', 'selected', 'order'],
  publicOps: ['get', 'list', 'updateOne'],
  publicFilterKeys: ['id', 'gallery_id'],
  // Clients may only toggle selection; everything else requires auth
  publicWritable: ['selected'],
  schema: z.object({
    gallery_id: z.string().min(1),
    image_url: z.string().min(1),
    thumbnail_url: optionalNullable(z.string()),
    filename: optionalNullable(z.string()),
    selected: z.boolean().optional(),
    order: z.number().optional(),
  }),
});

// Checklist templates: auth-only (admin management)
export const checklistTemplatesRouter = createEntityRouter({
  table: 'checklist_templates',
  columns: ['id', 'session_type', 'items', 'created_date', 'updated_date', 'created_by'],
  writable: ['session_type', 'items'],
  jsonbColumns: ['items'],
  schema: z.object({
    session_type: z.enum(tup(SESSION_TYPES)),
    items: z.array(z.object({
      text: z.string(),
      category: z.string().optional(),
    }).passthrough()),
  }),
});

// Shoot checklists: auth-only (photographer management)
export const shootChecklistsRouter = createEntityRouter({
  table: 'shoot_checklists',
  columns: ['id', 'booking_id', 'session_type', 'items', 'created_date', 'updated_date', 'created_by'],
  writable: ['booking_id', 'session_type', 'items'],
  jsonbColumns: ['items'],
  schema: z.object({
    booking_id: z.string().min(1),
    session_type: optionalNullable(z.string()),
    items: z.array(z.object({
      text: z.string(),
      category: z.string().optional(),
      completed: z.boolean().optional(),
    }).passthrough()),
  }),
});

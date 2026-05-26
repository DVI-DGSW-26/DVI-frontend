export {
  createCustomer,
  deleteCustomer,
  getCustomers,
  updateCustomer,
} from "./customerApi";
export {
  customerKeys,
  useCreateCustomer,
  useCustomerList,
  useDeleteCustomer,
  useUpdateCustomer,
} from "./queries";
export type {
  CreateCustomerRequest,
  Customer,
  UpdateCustomerRequest,
} from "./types";

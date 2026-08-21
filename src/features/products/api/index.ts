export {
  createProduct,
  deleteProduct,
  getProductDetail,
  getProducts,
  updateProduct,
  uploadProductSketch,
} from "./productApi";
export {
  productKeys,
  useCreateProduct,
  useDeleteProduct,
  useProductDetail,
  useProductList,
  useUpdateProduct,
  useUploadProductSketch,
} from "./queries";
export type {
  CreateProductRequest,
  ProcessType,
  ProductCustomerRef,
  ProductDetail,
  ProductDim,
  ProductDimInput,
  ProductListItem,
  ProductValueType,
  UpdateProductRequest,
} from "./types";

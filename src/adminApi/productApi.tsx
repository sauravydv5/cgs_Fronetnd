import adminInstance from "./adminInstance";


export const getAllProducts = () => adminInstance.get('/products');
export const updateProduct = ({id, data}: {id: string, data: any}) => adminInstance.put(`/products/${id}`, data);
export const getProductById = ({id}) => adminInstance.get(`/products/${id}`);
export const addProduct = ({data}) => adminInstance.post('/products', data);
export const deleteProduct = ({id}) => adminInstance.delete(`/products/${id}`);
export const searchProductByCode = ({ term }: { term: string }) => adminInstance.get(`/products/search?term=${term}`);

//Low-stock Apis
export const getLowStockProducts = () => adminInstance.get('/products/low-stock');
export const updateLowStockSettings = ({ data }: { data: any }) => adminInstance.put('/products/low-stock/settings', data);
export const updateProductStock = ({ id, stock }: { id: string, stock: number }) => adminInstance.patch(`/products/${id}/stock`, { stock });

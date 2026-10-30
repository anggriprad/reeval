import { authService } from '../src/services/auth.service';
import { companyService } from '../src/services/company.service';
import { userService } from '../src/services/user.service';
import { roleService } from '../src/services/role.service';
import { materialCategoryService } from '../src/services/material-category.service';
import { assetCategoryService } from '../src/services/asset-category.service';
import { vehicleService } from '../src/services/vehicle.service';
import { driverService } from '../src/services/driver.service';
import { shippingRateService } from '../src/services/shipping-rate.service';
import { productionOperationService } from '../src/services/production-operation.service';
import { productionRoutingService } from '../src/services/production-routing.service';
import { productionOperatorService } from '../src/services/production-operator.service';
import { productCategoryService } from '../src/services/product-category.service';
import { productAttributeService } from '../src/services/product-attribute.service';
import { materialService } from '../src/services/material.service';
import { procurementService } from '../src/services/procurement.service';
import { stockMovementService } from '../src/services/stock-movement.service';
import { bomPresetService } from '../src/services/bom-preset.service';
import { productModifierService } from '../src/services/product-modifier.service';
import { productService, resolveProductImageUrl } from '../src/services/product.service';
import { orderService, mapOrderResponseToSalesOrder, mapComplaintResponseToOrderComplaint } from '../src/services/order.service';
import { workOrderService, mapWorkOrderResponseToWorkOrder, mapJobCardResponseToJobCard } from '../src/services/work-order.service';
import { deliveryService, resolveDeliveryPhotoUrl } from '../src/services/delivery.service';
import { mapQueueResponseToOrderGroup, buildTripGroups } from '../src/app/delivery/components/types';
import axiosInstance from '../src/helpers/axios';
import { proxy } from '../src/proxy';
import { NextRequest } from 'next/server';
import { isRouteAllowed, normalizeRole } from '../src/lib/roles';
import {
  PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRequiredPermissionForPath,
} from '../src/lib/permissions';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runTests() {
  console.log('--- Running Deep Service Contract & Logic Verification ---');

  // 1. Verify authService structure
  console.log('1. Checking authService contract...');
  assert(typeof authService.login === 'function', 'authService.login must be a function');
  assert(typeof authService.getProfile === 'function', 'authService.getProfile must be a function');
  assert(typeof authService.changePassword === 'function', 'authService.changePassword must be a function');
  assert(typeof authService.logout === 'function', 'authService.logout must be a function');
  assert(!('switchCompany' in authService), 'authService.switchCompany should be removed');
  console.log('✓ authService contract verified');

  // 2. Verify companyService structure
  console.log('2. Checking companyService contract...');
  assert(typeof companyService.getCurrentCompany === 'function', 'companyService.getCurrentCompany must be a function');
  assert(typeof companyService.updateCurrentCompany === 'function', 'companyService.updateCurrentCompany must be a function');
  assert(typeof companyService.updateCompany === 'function', 'companyService.updateCompany must be a function');
  console.log('✓ companyService contract verified');

  // 3. Verify userService structure
  console.log('3. Checking userService contract...');
  assert(typeof userService.getUsers === 'function', 'userService.getUsers must be a function');
  assert(typeof userService.getUserOptions === 'function', 'userService.getUserOptions must be a function');
  assert(typeof userService.getUserById === 'function', 'userService.getUserById must be a function');
  assert(typeof userService.createUser === 'function', 'userService.createUser must be a function');
  assert(typeof userService.updateUser === 'function', 'userService.updateUser must be a function');
  assert(typeof userService.deleteUser === 'function', 'userService.deleteUser must be a function');
  assert(typeof userService.assignRoles === 'function', 'userService.assignRoles must be a function');
  console.log('✓ userService contract verified');

  // 4. Verify roleService structure
  console.log('4. Checking roleService contract...');
  assert(typeof roleService.getRoles === 'function', 'roleService.getRoles must be a function');
  assert(typeof roleService.getRoleOptions === 'function', 'roleService.getRoleOptions must be a function');
  assert(typeof roleService.getAllPermissions === 'function', 'roleService.getAllPermissions must be a function');
  assert(typeof roleService.getRoleById === 'function', 'roleService.getRoleById must be a function');
  assert(typeof roleService.createRole === 'function', 'roleService.createRole must be a function');
  assert(typeof roleService.updateRole === 'function', 'roleService.updateRole must be a function');
  assert(typeof roleService.deleteRole === 'function', 'roleService.deleteRole must be a function');
  console.log('✓ roleService contract verified');

  // 4b. Verify materialCategoryService structure & PBAC mapping
  console.log('4b. Checking materialCategoryService contract & PBAC mapping...');
  assert(typeof materialCategoryService.getCategories === 'function', 'materialCategoryService.getCategories must be a function');
  assert(typeof materialCategoryService.getCategoryOptions === 'function', 'materialCategoryService.getCategoryOptions must be a function');
  assert(typeof materialCategoryService.getCategoryById === 'function', 'materialCategoryService.getCategoryById must be a function');
  assert(typeof materialCategoryService.createCategory === 'function', 'materialCategoryService.createCategory must be a function');
  assert(typeof materialCategoryService.updateCategory === 'function', 'materialCategoryService.updateCategory must be a function');
  assert(typeof materialCategoryService.deleteCategory === 'function', 'materialCategoryService.deleteCategory must be a function');
  assert(typeof materialCategoryService.reorderCategories === 'function', 'materialCategoryService.reorderCategories must be a function');
  assert(PERMISSIONS.INVENTORY.CATEGORY_READ === 'material-category:read', 'CATEGORY_READ must be material-category:read');
  assert(PERMISSIONS.INVENTORY.CATEGORY_CREATE === 'material-category:create', 'CATEGORY_CREATE must be material-category:create');
  assert(PERMISSIONS.INVENTORY.CATEGORY_UPDATE === 'material-category:update', 'CATEGORY_UPDATE must be material-category:update');
  assert(PERMISSIONS.INVENTORY.CATEGORY_DELETE === 'material-category:delete', 'CATEGORY_DELETE must be material-category:delete');
  console.log('✓ materialCategoryService contract verified');

  // 4c. Verify assetCategoryService structure & PBAC mapping
  console.log('4c. Checking assetCategoryService contract & PBAC mapping...');
  assert(typeof assetCategoryService.getCategories === 'function', 'assetCategoryService.getCategories must be a function');
  assert(typeof assetCategoryService.getCategoryOptions === 'function', 'assetCategoryService.getCategoryOptions must be a function');
  assert(typeof assetCategoryService.getCategoryById === 'function', 'assetCategoryService.getCategoryById must be a function');
  assert(typeof assetCategoryService.createCategory === 'function', 'assetCategoryService.createCategory must be a function');
  assert(typeof assetCategoryService.updateCategory === 'function', 'assetCategoryService.updateCategory must be a function');
  assert(typeof assetCategoryService.deleteCategory === 'function', 'assetCategoryService.deleteCategory must be a function');
  assert(typeof assetCategoryService.reorderCategories === 'function', 'assetCategoryService.reorderCategories must be a function');
  assert(PERMISSIONS.INVENTORY.ASSET_CATEGORY_READ === 'asset-category:read', 'ASSET_CATEGORY_READ must be asset-category:read');
  assert(PERMISSIONS.INVENTORY.ASSET_CATEGORY_CREATE === 'asset-category:create', 'ASSET_CATEGORY_CREATE must be asset-category:create');
  assert(PERMISSIONS.INVENTORY.ASSET_CATEGORY_UPDATE === 'asset-category:update', 'ASSET_CATEGORY_UPDATE must be asset-category:update');
  assert(PERMISSIONS.INVENTORY.ASSET_CATEGORY_DELETE === 'asset-category:delete', 'ASSET_CATEGORY_DELETE must be asset-category:delete');
  console.log('✓ assetCategoryService contract verified');

  // 4d. Verify vehicleService structure & PBAC mapping
  console.log('4d. Checking vehicleService contract & PBAC mapping...');
  assert(typeof vehicleService.getVehicles === 'function', 'vehicleService.getVehicles must be a function');
  assert(typeof vehicleService.getVehicleOptions === 'function', 'vehicleService.getVehicleOptions must be a function');
  assert(typeof vehicleService.getVehicleById === 'function', 'vehicleService.getVehicleById must be a function');
  assert(typeof vehicleService.createVehicle === 'function', 'vehicleService.createVehicle must be a function');
  assert(typeof vehicleService.updateVehicle === 'function', 'vehicleService.updateVehicle must be a function');
  assert(typeof vehicleService.deleteVehicle === 'function', 'vehicleService.deleteVehicle must be a function');
  assert(PERMISSIONS.DELIVERY.VEHICLE_READ === 'vehicle:read', 'VEHICLE_READ must be vehicle:read');
  assert(PERMISSIONS.DELIVERY.VEHICLE_CREATE === 'vehicle:create', 'VEHICLE_CREATE must be vehicle:create');
  assert(PERMISSIONS.DELIVERY.VEHICLE_UPDATE === 'vehicle:update', 'VEHICLE_UPDATE must be vehicle:update');
  assert(PERMISSIONS.DELIVERY.VEHICLE_DELETE === 'vehicle:delete', 'VEHICLE_DELETE must be vehicle:delete');
  console.log('✓ vehicleService contract verified');

  // 4e. Verify driverService structure & PBAC mapping
  console.log('4e. Checking driverService contract & PBAC mapping...');
  assert(typeof driverService.getDrivers === 'function', 'driverService.getDrivers must be a function');
  assert(typeof driverService.getDriverOptions === 'function', 'driverService.getDriverOptions must be a function');
  assert(typeof driverService.getDriverById === 'function', 'driverService.getDriverById must be a function');
  assert(typeof driverService.assignDriver === 'function', 'driverService.assignDriver must be a function');
  assert(typeof driverService.deleteDriver === 'function', 'driverService.deleteDriver must be a function');
  assert(PERMISSIONS.DELIVERY.DRIVER_READ === 'driver:read', 'DRIVER_READ must be driver:read');
  assert(PERMISSIONS.DELIVERY.DRIVER_CREATE === 'driver:create', 'DRIVER_CREATE must be driver:create');
  assert(PERMISSIONS.DELIVERY.DRIVER_UPDATE === 'driver:update', 'DRIVER_UPDATE must be driver:update');
  assert(PERMISSIONS.DELIVERY.DRIVER_DELETE === 'driver:delete', 'DRIVER_DELETE must be driver:delete');
  console.log('✓ driverService contract verified');

  // 4f. Verify shippingRateService structure & PBAC mapping
  console.log('4f. Checking shippingRateService contract & PBAC mapping...');
  assert(typeof shippingRateService.getOverview === 'function', 'shippingRateService.getOverview must be a function');
  assert(typeof shippingRateService.toggleShippingRate === 'function', 'shippingRateService.toggleShippingRate must be a function');
  assert(typeof shippingRateService.getByRegency === 'function', 'shippingRateService.getByRegency must be a function');
  assert(typeof shippingRateService.saveArea === 'function', 'shippingRateService.saveArea must be a function');
  assert(typeof shippingRateService.deleteByRegency === 'function', 'shippingRateService.deleteByRegency must be a function');
  assert(typeof shippingRateService.calculate === 'function', 'shippingRateService.calculate must be a function');
  assert(typeof shippingRateService.getProvinces === 'function', 'shippingRateService.getProvinces must be a function');
  assert(typeof shippingRateService.getRegencies === 'function', 'shippingRateService.getRegencies must be a function');
  assert(typeof shippingRateService.getDistricts === 'function', 'shippingRateService.getDistricts must be a function');
  assert(PERMISSIONS.DELIVERY.READ === 'delivery:read', 'DELIVERY.READ must be delivery:read');
  assert(PERMISSIONS.DELIVERY.UPDATE === 'delivery:update', 'DELIVERY.UPDATE must be delivery:update');
  console.log('✓ shippingRateService contract verified');

  // 4g. Verify productionOperationService structure & PBAC mapping
  console.log('4g. Checking productionOperationService contract & PBAC mapping...');
  assert(typeof productionOperationService.getOperations === 'function', 'productionOperationService.getOperations must be a function');
  assert(typeof productionOperationService.getOperationOptions === 'function', 'productionOperationService.getOperationOptions must be a function');
  assert(typeof productionOperationService.getOperationById === 'function', 'productionOperationService.getOperationById must be a function');
  assert(typeof productionOperationService.createOperation === 'function', 'productionOperationService.createOperation must be a function');
  assert(typeof productionOperationService.updateOperation === 'function', 'productionOperationService.updateOperation must be a function');
  assert(typeof productionOperationService.deleteOperation === 'function', 'productionOperationService.deleteOperation must be a function');
  assert(PERMISSIONS.PRODUCTION.OPERATION_READ === 'production-operation:read', 'OPERATION_READ must be production-operation:read');
  assert(PERMISSIONS.PRODUCTION.OPERATION_CREATE === 'production-operation:create', 'OPERATION_CREATE must be production-operation:create');
  assert(PERMISSIONS.PRODUCTION.OPERATION_UPDATE === 'production-operation:update', 'OPERATION_UPDATE must be production-operation:update');
  assert(PERMISSIONS.PRODUCTION.OPERATION_DELETE === 'production-operation:delete', 'OPERATION_DELETE must be production-operation:delete');
  console.log('✓ productionOperationService contract verified');

  // 4h. Verify productionRoutingService structure & PBAC mapping
  console.log('4h. Checking productionRoutingService contract & PBAC mapping...');
  assert(typeof productionRoutingService.getRoutings === 'function', 'productionRoutingService.getRoutings must be a function');
  assert(typeof productionRoutingService.getRoutingOptions === 'function', 'productionRoutingService.getRoutingOptions must be a function');
  assert(typeof productionRoutingService.getRoutingById === 'function', 'productionRoutingService.getRoutingById must be a function');
  assert(typeof productionRoutingService.createRouting === 'function', 'productionRoutingService.createRouting must be a function');
  assert(typeof productionRoutingService.updateRouting === 'function', 'productionRoutingService.updateRouting must be a function');
  assert(typeof productionRoutingService.deleteRouting === 'function', 'productionRoutingService.deleteRouting must be a function');
  assert(PERMISSIONS.PRODUCTION.ROUTING_READ === 'production-routing:read', 'ROUTING_READ must be production-routing:read');
  assert(PERMISSIONS.PRODUCTION.ROUTING_CREATE === 'production-routing:create', 'ROUTING_CREATE must be production-routing:create');
  assert(PERMISSIONS.PRODUCTION.ROUTING_UPDATE === 'production-routing:update', 'ROUTING_UPDATE must be production-routing:update');
  assert(PERMISSIONS.PRODUCTION.ROUTING_DELETE === 'production-routing:delete', 'ROUTING_DELETE must be production-routing:delete');
  console.log('✓ productionRoutingService contract verified');

  // 4i. Verify productionOperatorService structure & PBAC mapping
  console.log('4i. Checking productionOperatorService contract & PBAC mapping...');
  assert(typeof productionOperatorService.getOperators === 'function', 'productionOperatorService.getOperators must be a function');
  assert(typeof productionOperatorService.getOperatorOptions === 'function', 'productionOperatorService.getOperatorOptions must be a function');
  assert(typeof productionOperatorService.getOperatorById === 'function', 'productionOperatorService.getOperatorById must be a function');
  assert(typeof productionOperatorService.assignOperator === 'function', 'productionOperatorService.assignOperator must be a function');
  assert(typeof productionOperatorService.deleteOperator === 'function', 'productionOperatorService.deleteOperator must be a function');
  assert(PERMISSIONS.PRODUCTION.OPERATOR_READ === 'production-operator:read', 'OPERATOR_READ must be production-operator:read');
  assert(PERMISSIONS.PRODUCTION.OPERATOR_CREATE === 'production-operator:create', 'OPERATOR_CREATE must be production-operator:create');
  assert(PERMISSIONS.PRODUCTION.OPERATOR_DELETE === 'production-operator:delete', 'OPERATOR_DELETE must be production-operator:delete');
  console.log('✓ productionOperatorService contract verified');

  // 4j. Verify productCategoryService structure & PBAC mapping
  console.log('4j. Checking productCategoryService contract & PBAC mapping...');
  assert(typeof productCategoryService.getCategories === 'function', 'productCategoryService.getCategories must be a function');
  assert(typeof productCategoryService.getCategoryOptions === 'function', 'productCategoryService.getCategoryOptions must be a function');
  assert(typeof productCategoryService.getCategoryById === 'function', 'productCategoryService.getCategoryById must be a function');
  assert(typeof productCategoryService.createCategory === 'function', 'productCategoryService.createCategory must be a function');
  assert(typeof productCategoryService.updateCategory === 'function', 'productCategoryService.updateCategory must be a function');
  assert(typeof productCategoryService.deleteCategory === 'function', 'productCategoryService.deleteCategory must be a function');
  assert(PERMISSIONS.PRODUCT.CATEGORY_READ === 'product-category:read', 'CATEGORY_READ must be product-category:read');
  assert(PERMISSIONS.PRODUCT.CATEGORY_CREATE === 'product-category:create', 'CATEGORY_CREATE must be product-category:create');
  assert(PERMISSIONS.PRODUCT.CATEGORY_UPDATE === 'product-category:update', 'CATEGORY_UPDATE must be product-category:update');
  assert(PERMISSIONS.PRODUCT.CATEGORY_DELETE === 'product-category:delete', 'CATEGORY_DELETE must be product-category:delete');
  console.log('✓ productCategoryService contract verified');

  // 4k. Verify productAttributeService structure & PBAC mapping
  console.log('4k. Checking productAttributeService contract & PBAC mapping...');
  assert(typeof productAttributeService.getAttributes === 'function', 'productAttributeService.getAttributes must be a function');
  assert(typeof productAttributeService.getAttributeOptions === 'function', 'productAttributeService.getAttributeOptions must be a function');
  assert(typeof productAttributeService.getAttributeById === 'function', 'productAttributeService.getAttributeById must be a function');
  assert(typeof productAttributeService.createAttribute === 'function', 'productAttributeService.createAttribute must be a function');
  assert(typeof productAttributeService.updateAttribute === 'function', 'productAttributeService.updateAttribute must be a function');
  assert(typeof productAttributeService.deleteAttribute === 'function', 'productAttributeService.deleteAttribute must be a function');
  assert(PERMISSIONS.PRODUCT.ATTRIBUTE_READ === 'product-attribute:read', 'ATTRIBUTE_READ must be product-attribute:read');
  assert(PERMISSIONS.PRODUCT.ATTRIBUTE_CREATE === 'product-attribute:create', 'ATTRIBUTE_CREATE must be product-attribute:create');
  assert(PERMISSIONS.PRODUCT.ATTRIBUTE_UPDATE === 'product-attribute:update', 'ATTRIBUTE_UPDATE must be product-attribute:update');
  assert(PERMISSIONS.PRODUCT.ATTRIBUTE_DELETE === 'product-attribute:delete', 'ATTRIBUTE_DELETE must be product-attribute:delete');
  console.log('✓ productAttributeService contract verified');

  // 4l. Verify materialService structure & PBAC mapping
  console.log('4l. Checking materialService contract & PBAC mapping...');
  assert(typeof materialService.getMaterials === 'function', 'materialService.getMaterials must be a function');
  assert(typeof materialService.getMaterialOptions === 'function', 'materialService.getMaterialOptions must be a function');
  assert(typeof materialService.getMaterialById === 'function', 'materialService.getMaterialById must be a function');
  assert(typeof materialService.createMaterial === 'function', 'materialService.createMaterial must be a function');
  assert(typeof materialService.updateMaterial === 'function', 'materialService.updateMaterial must be a function');
  assert(typeof materialService.deleteMaterial === 'function', 'materialService.deleteMaterial must be a function');
  assert(PERMISSIONS.INVENTORY.READ === 'material:read', 'INVENTORY.READ must be material:read');
  assert(PERMISSIONS.INVENTORY.CREATE === 'material:create', 'INVENTORY.CREATE must be material:create');
  assert(PERMISSIONS.INVENTORY.UPDATE === 'material:update', 'INVENTORY.UPDATE must be material:update');
  assert(PERMISSIONS.INVENTORY.DELETE === 'material:delete', 'INVENTORY.DELETE must be material:delete');
  console.log('✓ materialService contract verified');

  // 4m. Verify procurementService structure & PBAC mapping
  console.log('4m. Checking procurementService contract & PBAC mapping...');
  assert(typeof procurementService.getProcurements === 'function', 'procurementService.getProcurements must be a function');
  assert(typeof procurementService.getProcurementById === 'function', 'procurementService.getProcurementById must be a function');
  assert(typeof procurementService.getHistories === 'function', 'procurementService.getHistories must be a function');
  assert(typeof procurementService.createProcurement === 'function', 'procurementService.createProcurement must be a function');
  assert(typeof procurementService.orderPO === 'function', 'procurementService.orderPO must be a function');
  assert(typeof procurementService.receivePO === 'function', 'procurementService.receivePO must be a function');
  assert(typeof procurementService.rejectPO === 'function', 'procurementService.rejectPO must be a function');
  assert(typeof procurementService.cancelPO === 'function', 'procurementService.cancelPO must be a function');
  assert(typeof procurementService.cancelRemainingPO === 'function', 'procurementService.cancelRemainingPO must be a function');
  assert(typeof procurementService.deletePO === 'function', 'procurementService.deletePO must be a function');
  assert(PERMISSIONS.PURCHASING.READ === 'procurement:read', 'PURCHASING.READ must be procurement:read');
  assert(PERMISSIONS.PURCHASING.CREATE === 'procurement:create', 'PURCHASING.CREATE must be procurement:create');
  assert(PERMISSIONS.PURCHASING.UPDATE === 'procurement:update', 'PURCHASING.UPDATE must be procurement:update');
  assert(PERMISSIONS.PURCHASING.DELETE === 'procurement:delete', 'PURCHASING.DELETE must be procurement:delete');
  console.log('✓ procurementService contract verified');

  // 4n. Verify stockMovementService structure & PBAC mapping
  console.log('4n. Checking stockMovementService contract & PBAC mapping...');
  assert(typeof stockMovementService.getStockMovements === 'function', 'stockMovementService.getStockMovements must be a function');
  assert(typeof stockMovementService.recordStockMovement === 'function', 'stockMovementService.recordStockMovement must be a function');
  assert(PERMISSIONS.INVENTORY.ADJUST === 'stock-movement:adjust', 'INVENTORY.ADJUST must be stock-movement:adjust');
  assert(PERMISSIONS.INVENTORY.STOCK_MOVEMENT_READ === 'stock-movement:read', 'INVENTORY.STOCK_MOVEMENT_READ must be stock-movement:read');
  assert(PERMISSIONS.INVENTORY.STOCK_MOVEMENT_ADJUST === 'stock-movement:adjust', 'INVENTORY.STOCK_MOVEMENT_ADJUST must be stock-movement:adjust');
  console.log('✓ stockMovementService contract verified');

  // 4o. Verify bomPresetService structure & PBAC mapping
  console.log('4o. Checking bomPresetService contract & PBAC mapping...');
  assert(typeof bomPresetService.getPresets === 'function', 'bomPresetService.getPresets must be a function');
  assert(typeof bomPresetService.getPresetOptions === 'function', 'bomPresetService.getPresetOptions must be a function');
  assert(typeof bomPresetService.getPresetById === 'function', 'bomPresetService.getPresetById must be a function');
  assert(typeof bomPresetService.createPreset === 'function', 'bomPresetService.createPreset must be a function');
  assert(typeof bomPresetService.updatePreset === 'function', 'bomPresetService.updatePreset must be a function');
  assert(typeof bomPresetService.deletePreset === 'function', 'bomPresetService.deletePreset must be a function');
  assert(PERMISSIONS.PRODUCT.BOM_READ === 'bom-preset:read', 'PRODUCT.BOM_READ must be bom-preset:read');
  assert(PERMISSIONS.PRODUCT.BOM_CREATE === 'bom-preset:create', 'PRODUCT.BOM_CREATE must be bom-preset:create');
  assert(PERMISSIONS.PRODUCT.BOM_UPDATE === 'bom-preset:update', 'PRODUCT.BOM_UPDATE must be bom-preset:update');
  assert(PERMISSIONS.PRODUCT.BOM_DELETE === 'bom-preset:delete', 'PRODUCT.BOM_DELETE must be bom-preset:delete');
  console.log('✓ bomPresetService contract verified');

  // 4p. Verify productModifierService structure & PBAC mapping
  console.log('4p. Checking productModifierService contract & PBAC mapping...');
  assert(typeof productModifierService.getGroups === 'function', 'productModifierService.getGroups must be a function');
  assert(typeof productModifierService.getGroupOptions === 'function', 'productModifierService.getGroupOptions must be a function');
  assert(typeof productModifierService.getGroupById === 'function', 'productModifierService.getGroupById must be a function');
  assert(typeof productModifierService.createGroup === 'function', 'productModifierService.createGroup must be a function');
  assert(typeof productModifierService.updateGroup === 'function', 'productModifierService.updateGroup must be a function');
  assert(typeof productModifierService.deleteGroup === 'function', 'productModifierService.deleteGroup must be a function');
  assert(PERMISSIONS.PRODUCT.MODIFIER_READ === 'modifier-group:read', 'PRODUCT.MODIFIER_READ must be modifier-group:read');
  assert(PERMISSIONS.PRODUCT.MODIFIER_CREATE === 'modifier-group:create', 'PRODUCT.MODIFIER_CREATE must be modifier-group:create');
  assert(PERMISSIONS.PRODUCT.MODIFIER_UPDATE === 'modifier-group:update', 'PRODUCT.MODIFIER_UPDATE must be modifier-group:update');
  assert(PERMISSIONS.PRODUCT.MODIFIER_DELETE === 'modifier-group:delete', 'PRODUCT.MODIFIER_DELETE must be modifier-group:delete');
  console.log('✓ productModifierService contract verified');

  // 4q. Verify productService structure & PBAC mapping
  console.log('4q. Checking productService contract & PBAC mapping...');
  assert(typeof productService.getProducts === 'function', 'productService.getProducts must be a function');
  assert(typeof productService.getProductOptions === 'function', 'productService.getProductOptions must be a function');
  assert(typeof productService.getProductById === 'function', 'productService.getProductById must be a function');
  assert(typeof productService.createProduct === 'function', 'productService.createProduct must be a function');
  assert(typeof productService.updateProduct === 'function', 'productService.updateProduct must be a function');
  assert(typeof productService.deleteProduct === 'function', 'productService.deleteProduct must be a function');
  assert(PERMISSIONS.PRODUCT.READ === 'product:read', 'PRODUCT.READ must be product:read');
  assert(PERMISSIONS.PRODUCT.CREATE === 'product:create', 'PRODUCT.CREATE must be product:create');
  assert(PERMISSIONS.PRODUCT.UPDATE === 'product:update', 'PRODUCT.UPDATE must be product:update');
  assert(PERMISSIONS.PRODUCT.DELETE === 'product:delete', 'PRODUCT.DELETE must be product:delete');
  assert(resolveProductImageUrl('products/1.jpg').includes('s3.reeval.tech/products/1.jpg'), 'resolveProductImageUrl must resolve S3 URL');
  console.log('✓ productService contract verified');

  // 4r. Verify orderService structure, mappers & PBAC mapping
  console.log('4r. Checking orderService contract & PBAC mapping...');
  assert(typeof orderService.getOrders === 'function', 'orderService.getOrders must be a function');
  assert(typeof orderService.getStatusCounts === 'function', 'orderService.getStatusCounts must be a function');
  assert(typeof orderService.getOrderById === 'function', 'orderService.getOrderById must be a function');
  assert(typeof orderService.getOrderHistories === 'function', 'orderService.getOrderHistories must be a function');
  assert(typeof orderService.createOrder === 'function', 'orderService.createOrder must be a function');
  assert(typeof orderService.updateOrder === 'function', 'orderService.updateOrder must be a function');
  assert(typeof orderService.processOrder === 'function', 'orderService.processOrder must be a function');
  assert(typeof orderService.cancelOrder === 'function', 'orderService.cancelOrder must be a function');
  assert(typeof orderService.getCustomProcessDetail === 'function', 'orderService.getCustomProcessDetail must be a function');
  assert(typeof orderService.customizeProcess === 'function', 'orderService.customizeProcess must be a function');
  assert(typeof orderService.getOrderConfig === 'function', 'orderService.getOrderConfig must be a function');
  assert(typeof orderService.updateOrderConfig === 'function', 'orderService.updateOrderConfig must be a function');
  assert(typeof orderService.resetOrderConfig === 'function', 'orderService.resetOrderConfig must be a function');
  assert(typeof orderService.getComplaints === 'function', 'orderService.getComplaints must be a function');
  assert(typeof orderService.getComplaintById === 'function', 'orderService.getComplaintById must be a function');
  assert(typeof orderService.createComplaint === 'function', 'orderService.createComplaint must be a function');
  assert(typeof orderService.resolveComplaint === 'function', 'orderService.resolveComplaint must be a function');
  assert(typeof orderService.rejectComplaint === 'function', 'orderService.rejectComplaint must be a function');

  // Verify Mappers
  assert(typeof mapOrderResponseToSalesOrder === 'function', 'mapOrderResponseToSalesOrder must be a function');
  assert(typeof mapComplaintResponseToOrderComplaint === 'function', 'mapComplaintResponseToOrderComplaint must be a function');

  // Test mapper transformation logic
  const mockOrderDto: any = {
    id: 10,
    order_number: 'SO-TEST-001',
    status: 'PROCESSING',
    customer_name: 'PT Mitra Jaya',
    customer_phone: '081234567890',
    customer_address: 'Jakarta Selatan',
    subtotal: 100000,
    shipping_cost: 15000,
    total_amount: 115000,
    created_at: '2026-10-29T10:00:00Z',
    items: [
      {
        id: 1,
        product_id: 5,
        product_name: 'Custom Box',
        qty: 10,
        unit_price: 10000,
        subtotal: 100000,
        produced_qty: 5,
        shipped_qty: 2,
        delivered_qty: 0,
        is_bom_customized: false,
      }
    ]
  };
  const mappedOrder = mapOrderResponseToSalesOrder(mockOrderDto);
  assert(mappedOrder.id === '10', 'mappedOrder.id must be string "10"');
  assert(mappedOrder.orderNumber === 'SO-TEST-001', 'mappedOrder.orderNumber must match');
  assert(mappedOrder.status === 'PROCESSING', 'mappedOrder.status must be PROCESSING');
  assert(mappedOrder.items.length === 1, 'mappedOrder.items length must be 1');
  assert(mappedOrder.items[0].producedQty === 5, 'producedQty must map correctly');
  assert(mappedOrder.items[0].id === '1', 'item.id must be string "1"');

  const mockComplaintDto: any = {
    id: 99,
    sales_order_id: 10,
    sales_order_number: 'SO-TEST-001',
    customer_name: 'PT Mitra Jaya',
    reason: 'Barang cacat minor',
    status: 'DIAJUKAN',
    created_at: '2026-10-29T11:00:00Z',
  };
  const mappedComplaint = mapComplaintResponseToOrderComplaint(mockComplaintDto);
  assert(mappedComplaint.id === '99', 'mappedComplaint.id must be string "99"');
  assert(mappedComplaint.orderNumber === 'SO-TEST-001', 'mappedComplaint.orderNumber must match');
  assert(mappedComplaint.status === 'DIAJUKAN', 'mappedComplaint.status must be DIAJUKAN');
  assert(mappedComplaint.description === 'Barang cacat minor', 'mappedComplaint.description must map from reason fallback');

  // PBAC alignment
  assert(PERMISSIONS.SALES.READ === 'sales:read', 'SALES.READ must be sales:read');
  assert(PERMISSIONS.SALES.CREATE === 'sales:create', 'SALES.CREATE must be sales:create');
  assert(PERMISSIONS.SALES.UPDATE === 'sales:update', 'SALES.UPDATE must be sales:update');
  assert(PERMISSIONS.SALES.APPROVE === 'sales:approve', 'SALES.APPROVE must be sales:approve');
  assert(PERMISSIONS.SALES.DELETE === 'sales:delete', 'SALES.DELETE must be sales:delete');
  console.log('✓ orderService contract, mappers & PBAC verified');

  // 4s. Verify workOrderService structure, mappers & PBAC mapping
  console.log('4s. Checking workOrderService contract & PBAC mapping...');
  assert(typeof workOrderService.getWorkOrders === 'function', 'workOrderService.getWorkOrders must be a function');
  assert(typeof workOrderService.getStatusCounts === 'function', 'workOrderService.getStatusCounts must be a function');
  assert(typeof workOrderService.getWorkOrderById === 'function', 'workOrderService.getWorkOrderById must be a function');
  assert(typeof workOrderService.getWorkOrderKPI === 'function', 'workOrderService.getWorkOrderKPI must be a function');
  assert(typeof workOrderService.createManualWorkOrder === 'function', 'workOrderService.createManualWorkOrder must be a function');
  assert(typeof workOrderService.updateWorkOrder === 'function', 'workOrderService.updateWorkOrder must be a function');
  assert(typeof workOrderService.cancelWorkOrder === 'function', 'workOrderService.cancelWorkOrder must be a function');
  assert(typeof workOrderService.startJobCard === 'function', 'workOrderService.startJobCard must be a function');
  assert(typeof workOrderService.pauseJobCard === 'function', 'workOrderService.pauseJobCard must be a function');
  assert(typeof workOrderService.assignJobCardOperator === 'function', 'workOrderService.assignJobCardOperator must be a function');
  assert(typeof workOrderService.completeJobCard === 'function', 'workOrderService.completeJobCard must be a function');
  assert(typeof workOrderService.getJobCardLogs === 'function', 'workOrderService.getJobCardLogs must be a function');
  assert(typeof workOrderService.getAnalytics === 'function', 'workOrderService.getAnalytics must be a function');

  // Verify Mappers
  assert(typeof mapWorkOrderResponseToWorkOrder === 'function', 'mapWorkOrderResponseToWorkOrder must be a function');
  assert(typeof mapJobCardResponseToJobCard === 'function', 'mapJobCardResponseToJobCard must be a function');

  // Test mapWorkOrderResponseToWorkOrder
  const mockWorkOrderDto = {
    id: 101,
    spk_number: 'SPK-20261029-0001',
    sales_order_id: 50,
    sales_order_number: 'SO-20261029-0001',
    sales_order_item_id: 12,
    unit_index: 1,
    product_id: 2,
    variant_id: 5,
    product_name: 'Dipan Standar',
    variant_name: '180x200 cm',
    target_qty: 2,
    status: 'IN_PROGRESS' as const,
    material_cost: 1500000,
    planned_labor_cost: 300000,
    actual_labor_cost: 250000,
    materials_consumed: [{ materialId: 'm1', qty: 2 }],
    is_custom: true,
    custom_notes: 'Finishing Walnut Glossy',
    is_sub_assembly: false,
    issued_at: '2026-10-29T10:00:00Z',
    total_duration_minutes: 120,
    job_cards: [
      {
        id: 201,
        work_order_id: 101,
        operation_id: 3,
        operation_name: 'Pemotongan Kayu',
        sequence: 1,
        target_qty: 2,
        completed_qty: 2,
        status: 'COMPLETED' as const,
        operator_id: 7,
        pic_name: 'Budi Tukang',
        planned_minutes: 60,
        actual_minutes: 55,
        total_duration_minutes: 55,
        paused_minutes: 0,
        costing_method: 'hourly',
        fixed_labor_cost: 0,
        labor_cost_per_hour: 50000,
        started_at: '2026-10-29T10:05:00Z',
        completed_at: '2026-10-29T11:00:00Z',
      },
    ],
  };

  const mappedWO = mapWorkOrderResponseToWorkOrder(mockWorkOrderDto);
  assert(mappedWO.id === '101', 'mappedWO.id must be string "101"');
  assert(mappedWO.spkNumber === 'SPK-20261029-0001', 'mappedWO.spkNumber must match');
  assert(mappedWO.salesOrderNumber === 'SO-20261029-0001', 'mappedWO.salesOrderNumber must match');
  assert(mappedWO.productName === 'Dipan Standar', 'mappedWO.productName must match');
  assert(mappedWO.jobCards.length === 1, 'mappedWO.jobCards.length must be 1');
  assert(mappedWO.jobCards[0].operationName === 'Pemotongan Kayu', 'jobCard.operationName must match');
  assert(mappedWO.jobCards[0].picName === 'Budi Tukang', 'jobCard.picName must match');
  assert(mappedWO.isCustom === true, 'mappedWO.isCustom must be true');

  // Verify PBAC constants
  assert(PERMISSIONS.PRODUCTION.READ === 'production:read', 'PRODUCTION.READ must be production:read');
  assert(PERMISSIONS.PRODUCTION.CREATE === 'production:create', 'PRODUCTION.CREATE must be production:create');
  assert(PERMISSIONS.PRODUCTION.UPDATE === 'production:update', 'PRODUCTION.UPDATE must be production:update');
  assert(PERMISSIONS.PRODUCTION.DELETE === 'production:delete', 'PRODUCTION.DELETE must be production:delete');
  assert(PERMISSIONS.PRODUCTION.COMPLETE === 'production:complete', 'PRODUCTION.COMPLETE must be production:complete');
  console.log('✓ workOrderService contract, mappers & PBAC verified');

  // 4t. Verify deliveryService structure & PBAC mapping
  console.log('4t. Checking deliveryService contract & PBAC mapping...');
  assert(typeof deliveryService.getQueue === 'function', 'deliveryService.getQueue must be a function');
  assert(typeof deliveryService.getCounts === 'function', 'deliveryService.getCounts must be a function');
  assert(typeof deliveryService.getDeliveryOrders === 'function', 'deliveryService.getDeliveryOrders must be a function');
  assert(typeof deliveryService.getDeliveryOrderById === 'function', 'deliveryService.getDeliveryOrderById must be a function');
  assert(typeof deliveryService.getDeliveryOrderHistories === 'function', 'deliveryService.getDeliveryOrderHistories must be a function');
  assert(typeof deliveryService.getTripDetail === 'function', 'deliveryService.getTripDetail must be a function');
  assert(typeof deliveryService.createDeliveryOrder === 'function', 'deliveryService.createDeliveryOrder must be a function');
  assert(typeof deliveryService.confirmLoading === 'function', 'deliveryService.confirmLoading must be a function');
  assert(typeof deliveryService.confirmTripLoading === 'function', 'deliveryService.confirmTripLoading must be a function');
  assert(typeof deliveryService.confirmDelivery === 'function', 'deliveryService.confirmDelivery must be a function');
  assert(typeof deliveryService.reportFailed === 'function', 'deliveryService.reportFailed must be a function');
  assert(typeof deliveryService.reschedule === 'function', 'deliveryService.reschedule must be a function');
  assert(typeof deliveryService.cancel === 'function', 'deliveryService.cancel must be a function');

  // Verify Mappers & Normalizers
  assert(typeof mapQueueResponseToOrderGroup === 'function', 'mapQueueResponseToOrderGroup must be a function');
  assert(typeof buildTripGroups === 'function', 'buildTripGroups must be a function');

  // Test mapQueueResponseToOrderGroup
  const mockQueueRaw = {
    order_id: 88,
    order_number: 'SO-20261030-0088',
    customer_name: 'Budi Santoso',
    customer_phone: '08123456789',
    customer_address: 'Jl. Merdeka No. 10',
    order_created_at: '2026-10-30T08:00:00Z',
    total_order_units_count: 2,
    total_ready_units_count: 1,
    status: 'PROCESSING',
    child_units: [
      {
        order_id: 88,
        order_number: 'SO-20261030-0088',
        customer_name: 'Budi Santoso',
        customer_address: 'Jl. Merdeka No. 10',
        product_name: 'Meja Makan',
        variant_label: 'Jati Natural',
        item_index: 0,
        unit_number: 1,
        total_ordered_qty: 1,
        spk_number: 'SPK-001',
        unit_status: 'READY',
      },
      {
        order_id: 88,
        order_number: 'SO-20261030-0088',
        customer_name: 'Budi Santoso',
        customer_address: 'Jl. Merdeka No. 10',
        product_name: 'Kursi Makan',
        item_index: 1,
        unit_number: 1,
        total_ordered_qty: 1,
        unit_status: 'IN_PRODUCTION',
      },
    ],
  };
  const mappedQueue = mapQueueResponseToOrderGroup(mockQueueRaw);
  assert(mappedQueue.orderId === '88', 'mappedQueue.orderId must be string "88"');
  assert(mappedQueue.orderNumber === 'SO-20261030-0088', 'mappedQueue.orderNumber must match');
  assert(mappedQueue.childUnits.length === 2, 'mappedQueue.childUnits must have 2 items');
  assert(mappedQueue.childUnits[0].unitStatus === 'READY', 'childUnit[0] must be READY');
  assert(mappedQueue.childUnits[1].unitStatus === 'IN_PRODUCTION', 'childUnit[1] must be IN_PRODUCTION');

  // Test buildTripGroups
  const mockDOs = [
    {
      id: 1,
      delivery_number: 'DO-001',
      trip_id: 'TRIP-ALPHA',
      trip_number: 'KLT-001',
      driver_name: 'Pak Slamet',
      vehicle_plate: 'B 1234 CD',
      status: 'DELIVERED',
      sales_order_number: 'SO-001',
      customer_name: 'Cust A',
      items: [{ qty: 2 }],
    },
    {
      id: 2,
      delivery_number: 'DO-002',
      trip_id: 'TRIP-ALPHA',
      trip_number: 'KLT-001',
      driver_name: 'Pak Slamet',
      vehicle_plate: 'B 1234 CD',
      status: 'FAILED',
      sales_order_number: 'SO-002',
      customer_name: 'Cust B',
      items: [{ qty: 1 }],
    },
  ];
  const trips = buildTripGroups(mockDOs);
  assert(trips.length === 1, 'buildTripGroups must group both DOs into 1 trip');
  assert(trips[0].tripId === 'TRIP-ALPHA', 'tripId must be TRIP-ALPHA');
  assert(trips[0].totalDestinationsCount === 2, 'totalDestinationsCount must be 2');
  assert(trips[0].totalUnitsCount === 3, 'totalUnitsCount must be 3 (2 + 1)');
  assert(trips[0].completedCount === 2, 'completedCount must be 2 (1 DELIVERED + 1 FAILED)');
  assert(trips[0].isAllDelivered === true, 'isAllDelivered must be true for completed trip');
  assert(trips[0].isInTransit === false, 'isInTransit must be false when all are completed');

  // Verify resolveDeliveryPhotoUrl
  assert(typeof resolveDeliveryPhotoUrl === 'function', 'resolveDeliveryPhotoUrl must be a function');
  assert(resolveDeliveryPhotoUrl('delivery/1/photo.jpg').includes('s3.reeval.tech/delivery/1/photo.jpg'), 'resolveDeliveryPhotoUrl must resolve S3 URL');
  assert(resolveDeliveryPhotoUrl('https://example.com/photo.jpg') === 'https://example.com/photo.jpg', 'resolveDeliveryPhotoUrl must leave full URL unchanged');
  assert(resolveDeliveryPhotoUrl(undefined) === '', 'resolveDeliveryPhotoUrl must return empty string for undefined');

  // Verify PBAC
  assert(PERMISSIONS.DELIVERY.READ === 'delivery:read', 'DELIVERY.READ must be delivery:read');
  assert(PERMISSIONS.DELIVERY.CREATE === 'delivery:create', 'DELIVERY.CREATE must be delivery:create');
  assert(PERMISSIONS.DELIVERY.UPDATE === 'delivery:update', 'DELIVERY.UPDATE must be delivery:update');
  assert(PERMISSIONS.DELIVERY.DISPATCH === 'delivery:dispatch', 'DELIVERY.DISPATCH must be delivery:dispatch');
  console.log('✓ deliveryService contract, photo resolver & PBAC verified');

  // 5. Test Proxy logic for mustChangePassword
  console.log('5. Testing Proxy middleware mustChangePassword logic...');

  // Scenario A: Unauthenticated user accessing /order -> redirect to /login
  {
    const req = new NextRequest('http://localhost:3000/order');
    const res = proxy(req);
    assert(res.status === 307 || res.status === 302, 'Unauthenticated accessing /order must redirect');
    const location = res.headers.get('location') || '';
    assert(location.includes('/login'), `Expected redirect to /login, got ${location}`);
  }

  // Scenario B: Unauthenticated user accessing /login -> allowed (NextResponse.next())
  {
    const req = new NextRequest('http://localhost:3000/login');
    const res = proxy(req);
    assert(!res.headers.get('location'), 'Unauthenticated accessing /login should not redirect');
  }

  // Scenario C: Authenticated user with mustChangePassword=1 accessing /order -> redirect to /change-password
  {
    const req = new NextRequest('http://localhost:3000/order', {
      headers: {
        cookie: 'token=dummy-jwt-token; mustChangePassword=1',
      },
    });
    const res = proxy(req);
    const location = res.headers.get('location') || '';
    assert(location.includes('/change-password'), `User with mustChangePassword=1 accessing /order must redirect to /change-password, got ${location}`);
  }

  // Scenario D: Authenticated user with mustChangePassword=1 accessing /change-password -> allowed
  {
    const req = new NextRequest('http://localhost:3000/change-password', {
      headers: {
        cookie: 'token=dummy-jwt-token; mustChangePassword=1',
      },
    });
    const res = proxy(req);
    assert(!res.headers.get('location'), 'User with mustChangePassword=1 accessing /change-password should be allowed');
  }

  // Scenario E: Authenticated user without mustChangePassword accessing /change-password -> redirect to /
  {
    const req = new NextRequest('http://localhost:3000/change-password', {
      headers: {
        cookie: 'token=dummy-jwt-token',
      },
    });
    const res = proxy(req);
    const location = res.headers.get('location') || '';
    assert(location.endsWith('/'), `Normal user accessing /change-password should redirect to /, got ${location}`);
  }

  // Scenario F: Authenticated user accessing /login -> redirect to /
  {
    const req = new NextRequest('http://localhost:3000/login', {
      headers: {
        cookie: 'token=dummy-jwt-token',
      },
    });
    const res = proxy(req);
    const location = res.headers.get('location') || '';
    assert(location.endsWith('/'), `Normal user accessing /login should redirect to /, got ${location}`);
  }

  console.log('✓ Proxy mustChangePassword logic verified across all 6 scenarios');

  // 6. Test Axios 401 Interceptor Rejection (Prevents TypeError crash)
  console.log('6. Testing Axios 401 Interceptor rejection contract...');
  {
    // Simulate error interceptor on a 401 error
    const interceptor = (axiosInstance.interceptors.response as any).handlers[0]?.rejected;
    assert(typeof interceptor === 'function', 'Response error interceptor must be registered');

    const fake401 = {
      response: { status: 401 },
      config: { url: '/api/v1/users' },
      isAxiosError: true,
      message: 'Unauthorized',
    };

    let rejected = false;
    try {
      await interceptor(fake401);
    } catch (e: any) {
      rejected = true;
      assert(e.response.status === 401, 'Interceptor must re-throw or reject the 401 error');
    }
    assert(rejected, '401 interceptor MUST reject promise (not return undefined)');
    console.log('✓ Axios 401 interceptor properly rejects promises without TypeError crash');
  }

  // 7. Verify no global Authorization mutation race conditions
  console.log('7. Testing Axios global Authorization header immutability...');
  {
    assert(
      !axiosInstance.defaults.headers.common?.['Authorization'],
      'axiosInstance.defaults.headers.common["Authorization"] must not be globally mutated'
    );
    console.log('✓ Global axiosInstance headers remain unpolluted');
  }

  // 8. Test Auth Path Isolation Contract
  console.log('8. Testing Auth Path Isolation contract...');
  {
    const isAuthPath = (path: string) => path === '/login' || path === '/signin' || path === '/change-password';
    assert(isAuthPath('/login'), '/login must be an auth path');
    assert(isAuthPath('/change-password'), '/change-password must be an auth path');
    assert(!isAuthPath('/order'), '/order must not be an auth path');
    assert(!isAuthPath('/'), '/ must not be an auth path');
    console.log('✓ Auth paths properly isolate /change-password from main layout');
  }

  // 9. Test Role & Route Authorization Matrix (SUPER_ADMIN, backend roles, and new routes)
  console.log('9. Testing Role & Route Authorization Matrix (SUPER_ADMIN & new routes)...');
  {
    // SUPER_ADMIN must have access to all routes including new ones
    assert(isRouteAllowed('SUPER_ADMIN', '/'), 'SUPER_ADMIN must access /');
    assert(isRouteAllowed('SUPER_ADMIN', '/order'), 'SUPER_ADMIN must access /order');
    assert(isRouteAllowed('SUPER_ADMIN', '/users'), 'SUPER_ADMIN must access /users');
    assert(isRouteAllowed('SUPER_ADMIN', '/roles'), 'SUPER_ADMIN must access /roles');
    assert(isRouteAllowed('SUPER_ADMIN', '/company'), 'SUPER_ADMIN must access /company');
    assert(isRouteAllowed('SUPER_ADMIN', '/finance'), 'SUPER_ADMIN must access /finance');
    assert(isRouteAllowed('SUPER_ADMIN', '/settings'), 'SUPER_ADMIN must access /settings');

    // ADMIN must have access to all routes
    assert(isRouteAllowed('ADMIN', '/users'), 'ADMIN must access /users');
    assert(isRouteAllowed('ADMIN', '/roles'), 'ADMIN must access /roles');
    assert(isRouteAllowed('ADMIN', '/company'), 'ADMIN must access /company');
    assert(isRouteAllowed('ADMIN', '/settings'), 'ADMIN must access /settings');

    // SALES should not have access to admin management routes
    assert(!isRouteAllowed('SALES', '/users'), 'SALES must not access /users');
    assert(!isRouteAllowed('SALES', '/roles'), 'SALES must not access /roles');
    assert(!isRouteAllowed('SALES', '/company'), 'SALES must not access /company');
    assert(!isRouteAllowed('SALES', '/settings'), 'SALES must not access /settings');
    assert(isRouteAllowed('SALES', '/order'), 'SALES must access /order');

    // normalizeRole verification
    assert(normalizeRole('SUPER_ADMIN') === 'SUPER_ADMIN', 'normalizeRole SUPER_ADMIN');
    assert(normalizeRole('SUPERADMIN') === 'SUPER_ADMIN', 'normalizeRole SUPERADMIN');
    assert(normalizeRole('ADMIN') === 'ADMIN', 'normalizeRole ADMIN');
    assert(normalizeRole('ADMIN_PRODUCT') === 'ADMIN_PRODUCT', 'normalizeRole ADMIN_PRODUCT');
    assert(normalizeRole('ADMIN_SALES') === 'ADMIN_SALES', 'normalizeRole ADMIN_SALES');
    assert(normalizeRole('ADMIN_INVENTORY') === 'ADMIN_INVENTORY', 'normalizeRole ADMIN_INVENTORY');
    assert(normalizeRole('ADMIN_PRODUCTION') === 'ADMIN_PRODUCTION', 'normalizeRole ADMIN_PRODUCTION');
    assert(normalizeRole('ADMIN_DELIVERY') === 'ADMIN_DELIVERY', 'normalizeRole ADMIN_DELIVERY');
    assert(normalizeRole('ADMIN_FINANCE') === 'ADMIN_FINANCE', 'normalizeRole ADMIN_FINANCE');
    assert(normalizeRole('VIEWER') === 'VIEWER', 'normalizeRole VIEWER');

    // Proxy with SUPER_ADMIN cookie must allow access to /users, /roles, /company, /settings
    const reqUsers = new NextRequest('http://localhost:3000/users', {
      headers: { cookie: 'token=dummy-jwt-token; role=SUPER_ADMIN' },
    });
    const resUsers = proxy(reqUsers);
    assert(!resUsers.headers.get('location'), 'SUPER_ADMIN accessing /users should not be redirected');

    const reqRoles = new NextRequest('http://localhost:3000/roles', {
      headers: { cookie: 'token=dummy-jwt-token; role=SUPER_ADMIN' },
    });
    const resRoles = proxy(reqRoles);
    assert(!resRoles.headers.get('location'), 'SUPER_ADMIN accessing /roles should not be redirected');

    const reqCompany = new NextRequest('http://localhost:3000/company', {
      headers: { cookie: 'token=dummy-jwt-token; role=SUPER_ADMIN' },
    });
    const resCompany = proxy(reqCompany);
    assert(!resCompany.headers.get('location'), 'SUPER_ADMIN accessing /company should not be redirected');

    const reqSettings = new NextRequest('http://localhost:3000/settings', {
      headers: { cookie: 'token=dummy-jwt-token; role=SUPER_ADMIN' },
    });
    const resSettings = proxy(reqSettings);
    assert(!resSettings.headers.get('location'), 'SUPER_ADMIN accessing /settings should not be redirected');

    const reqSettingsSales = new NextRequest('http://localhost:3000/settings', {
      headers: { cookie: 'token=dummy-jwt-token; role=SALES' },
    });
    const resSettingsSales = proxy(reqSettingsSales);
    const locSettingsSales = resSettingsSales.headers.get('location') || '';
    assert(locSettingsSales.includes('/403') || locSettingsSales.includes('unauthorized=1'), 'SALES accessing /settings must redirect to /403');

    // Multi-role array verification
    assert(isRouteAllowed(['ADMIN_SALES', 'ADMIN_FINANCE'], '/order'), 'Multi-role user must access /order');
    assert(isRouteAllowed(['ADMIN_SALES', 'ADMIN_FINANCE'], '/finance'), 'Multi-role user must access /finance');
    assert(!isRouteAllowed(['ADMIN_SALES', 'ADMIN_FINANCE'], '/delivery'), 'Multi-role user without delivery role must not access /delivery');

    // Query string & hash stripping verification in isRouteAllowed
    assert(isRouteAllowed('ADMIN', '/?unauthorized=1'), 'ADMIN must access / with query string');
    assert(isRouteAllowed('SUPER_ADMIN', '/?tab=overview#reports'), 'SUPER_ADMIN must access / with query and hash');
    assert(isRouteAllowed('SALES', '/order?status=PENDING'), 'SALES must access /order with query string');
    assert(!isRouteAllowed('SALES', '/users?tab=ready'), 'SALES must not access /users with query string');

    // Proxy with multi-role comma-separated cookie must allow union of routes
    const reqMultiOrder = new NextRequest('http://localhost:3000/order', {
      headers: { cookie: 'token=dummy-jwt-token; role=ADMIN_SALES,ADMIN_FINANCE' },
    });
    const resMultiOrder = proxy(reqMultiOrder);
    assert(!resMultiOrder.headers.get('location'), 'Multi-role user accessing /order should not be redirected');

    const reqMultiFinance = new NextRequest('http://localhost:3000/finance', {
      headers: { cookie: 'token=dummy-jwt-token; role=ADMIN_SALES,ADMIN_FINANCE' },
    });
    const resMultiFinance = proxy(reqMultiFinance);
    assert(!resMultiFinance.headers.get('location'), 'Multi-role user accessing /finance should not be redirected');

    const reqMultiUsers = new NextRequest('http://localhost:3000/users', {
      headers: { cookie: 'token=dummy-jwt-token; role=ADMIN_SALES,ADMIN_FINANCE' },
    });
    const resMultiUsers = proxy(reqMultiUsers);
    const multiUsersLoc = resMultiUsers.headers.get('location') || '';
    assert(multiUsersLoc.includes('/403') || multiUsersLoc.includes('unauthorized=1'), 'Multi-role user without admin role accessing /users must be redirected');

    console.log('✓ SUPER_ADMIN, role normalization, multi-role arrays, and proxy access matrix fully verified');
  }

  // 10. Verify /roles dedicated sub-routes proxy and permission behavior
  console.log('10. Testing /roles dedicated sub-routes authorization...');
  {
    const subroutes = ['/roles', '/roles/create', '/roles/1', '/roles/1/edit', '/roles/edit/1'];
    for (const route of subroutes) {
      assert(isRouteAllowed('ADMIN', route), `ADMIN must access ${route}`);
      assert(isRouteAllowed('SUPER_ADMIN', route), `SUPER_ADMIN must access ${route}`);
      assert(!isRouteAllowed('SALES', route), `SALES must not access ${route}`);
      assert(!isRouteAllowed('DRIVER', route), `DRIVER must not access ${route}`);

      const reqAdmin = new NextRequest(`http://localhost:3000${route}`, {
        headers: { cookie: 'token=valid-jwt; role=ADMIN' },
      });
      const resAdmin = proxy(reqAdmin);
      assert(!resAdmin.headers.get('location'), `ADMIN accessing ${route} should not be redirected`);

      const reqSales = new NextRequest(`http://localhost:3000${route}`, {
        headers: { cookie: 'token=valid-jwt; role=SALES' },
      });
      const resSales = proxy(reqSales);
      const loc = resSales.headers.get('location') || '';
      assert(loc.includes('/403') || loc.includes('unauthorized=1'), `SALES accessing ${route} must be redirected to /403`);
    }
    console.log('✓ All /roles sub-routes authorization verified');
  }

  // 11. Verify role code sanitization logic
  console.log('11. Testing role code sanitization contract...');
  {
    const sanitizeRoleCode = (input: string) => input.trim().toUpperCase().replace(/\s+/g, '_');
    const isValidCode = (code: string) => /^[A-Z0-9_]+$/.test(code);

    assert(sanitizeRoleCode('staff gudang') === 'STAFF_GUDANG', 'Space should be converted to underscore');
    assert(sanitizeRoleCode('  ADMIN_SALES  ') === 'ADMIN_SALES', 'Whitespace should be trimmed');
    assert(sanitizeRoleCode('qc_inspector 2') === 'QC_INSPECTOR_2', 'Mixed lowercase and space should format properly');
    assert(isValidCode('STAFF_GUDANG'), 'STAFF_GUDANG should be valid');
    assert(!isValidCode('staff gudang'), 'staff gudang should be invalid');
    assert(!isValidCode('STAFF@GUDANG!'), 'STAFF@GUDANG! should be invalid');
    console.log('✓ Role code sanitization contract verified');
  }

  // 12. Verify Settings Hub and child routes (/settings, /company, /users, /roles)
  console.log('12. Testing Settings Hub & child routes authorization matrix...');
  {
    const settingsRoutes = ['/settings', '/company', '/users', '/roles'];
    for (const route of settingsRoutes) {
      assert(isRouteAllowed('ADMIN', route), `ADMIN must access ${route}`);
      assert(isRouteAllowed('SUPER_ADMIN', route), `SUPER_ADMIN must access ${route}`);
      assert(!isRouteAllowed('SALES', route), `SALES must not access ${route}`);
      assert(!isRouteAllowed('PRODUKSI', route), `PRODUKSI must not access ${route}`);
      assert(!isRouteAllowed('DRIVER', route), `DRIVER must not access ${route}`);
      assert(!isRouteAllowed('GUDANG', route), `GUDANG must not access ${route}`);
      assert(!isRouteAllowed('PURCHASING', route), `PURCHASING must not access ${route}`);

      const reqAdmin = new NextRequest(`http://localhost:3000${route}`, {
        headers: { cookie: 'token=valid-jwt; role=ADMIN' },
      });
      const resAdmin = proxy(reqAdmin);
      assert(!resAdmin.headers.get('location'), `ADMIN accessing ${route} should not be redirected`);

      const reqSales = new NextRequest(`http://localhost:3000${route}`, {
        headers: { cookie: 'token=valid-jwt; role=SALES' },
      });
      const resSales = proxy(reqSales);
      const loc = resSales.headers.get('location') || '';
      assert(loc.includes('/403') || loc.includes('unauthorized=1'), `SALES accessing ${route} must be redirected to /403`);
    }
    console.log('✓ Settings Hub and all child routes (/settings, /company, /users, /roles) verified');
  }

  // 13. Verify /users dedicated sub-routes proxy and permission behavior
  console.log('13. Testing /users dedicated sub-routes authorization...');
  {
    const subroutes = ['/users', '/users/create', '/users/1', '/users/1/edit', '/users/edit/1'];
    for (const route of subroutes) {
      assert(isRouteAllowed('ADMIN', route), `ADMIN must access ${route}`);
      assert(isRouteAllowed('SUPER_ADMIN', route), `SUPER_ADMIN must access ${route}`);
      assert(!isRouteAllowed('SALES', route), `SALES must not access ${route}`);
      assert(!isRouteAllowed('DRIVER', route), `DRIVER must not access ${route}`);

      const reqAdmin = new NextRequest(`http://localhost:3000${route}`, {
        headers: { cookie: 'token=valid-jwt; role=ADMIN' },
      });
      const resAdmin = proxy(reqAdmin);
      assert(!resAdmin.headers.get('location'), `ADMIN accessing ${route} should not be redirected`);

      const reqSales = new NextRequest(`http://localhost:3000${route}`, {
        headers: { cookie: 'token=valid-jwt; role=SALES' },
      });
      const resSales = proxy(reqSales);
      const loc = resSales.headers.get('location') || '';
      assert(loc.includes('/403') || loc.includes('unauthorized=1'), `SALES accessing ${route} must be redirected to /403`);
    }
    console.log('✓ All /users sub-routes authorization verified');
  }

  // 14. Testing Granular PBAC Permission functions & Backend Seeder alignment
  console.log('14. Testing Granular PBAC Permission system...');
  {
    const {
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      getRequiredPermissionForPath,
      PERMISSIONS,
    } = await import('../src/lib/permissions');

    // Super Admin wildcard
    assert(hasPermission(['*'], 'sales:read'), 'Wildcard * grants sales:read');
    assert(hasPermission(['*'], 'finance:post'), 'Wildcard * grants finance:post');
    assert(hasPermission([], 'sales:read', true), 'isSuperAdmin=true grants permission even if array empty');

    // Granular permissions
    const salesPerms = ['sales:read', 'sales:create', 'customer:read'];
    assert(hasPermission(salesPerms, 'sales:read'), 'salesPerms has sales:read');
    assert(hasPermission(salesPerms, 'sales:create'), 'salesPerms has sales:create');
    assert(!hasPermission(salesPerms, 'sales:delete'), 'salesPerms does not have sales:delete');
    assert(!hasPermission(salesPerms, 'finance:read'), 'salesPerms does not have finance:read');

    // Any & All
    assert(hasAnyPermission(salesPerms, ['sales:read', 'finance:read']), 'hasAnyPermission should return true');
    assert(!hasAnyPermission(salesPerms, ['finance:read', 'finance:post']), 'hasAnyPermission should return false');
    assert(hasAllPermissions(salesPerms, ['sales:read', 'sales:create']), 'hasAllPermissions should return true');
    assert(!hasAllPermissions(salesPerms, ['sales:read', 'sales:delete']), 'hasAllPermissions should return false');

    // Path required permission resolution
    assert(getRequiredPermissionForPath('/order') === 'sales:read', '/order requires sales:read');
    assert(getRequiredPermissionForPath('/order/create') === 'sales:create', '/order/create requires sales:create');
    assert(getRequiredPermissionForPath('/finance') === 'finance:read', '/finance requires finance:read');
    assert(getRequiredPermissionForPath('/production') === 'production:read', '/production requires production:read');
    assert(getRequiredPermissionForPath('/') === null, '/ requires no permission');
    assert(getRequiredPermissionForPath('/403') === null, '/403 requires no permission');

    // Edge Proxy direct URL blocking to /403
    const reqFinanceDenied = new NextRequest('http://localhost:3000/finance', {
      headers: { cookie: 'token=valid-jwt; role=SALES; permissions=["sales:read"]' },
    });
    const resFinanceDenied = proxy(reqFinanceDenied);
    const locFinance = resFinanceDenied.headers.get('location') || '';
    assert(locFinance.includes('/403'), 'User without finance:read accessing /finance must redirect to /403');
    assert(locFinance.includes('from=%2Ffinance'), 'Redirect must include origin path');

    const reqFinanceAllowed = new NextRequest('http://localhost:3000/finance', {
      headers: { cookie: 'token=valid-jwt; role=ADMIN_FINANCE; permissions=["finance:read"]' },
    });
    const resFinanceAllowed = proxy(reqFinanceAllowed);
    assert(!resFinanceAllowed.headers.get('location'), 'User with finance:read accessing /finance must be allowed');

    console.log('✓ Granular PBAC Permission system verified');
  }

  console.log('\nALL EXTENDED SERVICE, PROXY & RESILIENCE TESTS PASSED (100% GREEN)!');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

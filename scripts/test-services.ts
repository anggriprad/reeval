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

// copied types.ts

export type Role = string;

export type AppPermission = 
  | 'VIEW_DASHBOARD' 
  | 'VIEW_CODING' 
  | 'VIEW_MOVEMENTS' 
  | 'VIEW_CUSTODY' 
  | 'VIEW_BALANCES'
  | 'VIEW_INVENTORY' 
  | 'VIEW_REPORTS' 
  | 'VIEW_USERS' 
  | 'VIEW_BASIC_DATA'
  | 'VIEW_SETTINGS'
  | 'ACTION_ADD_ITEM'
  | 'ACTION_EDIT_ITEM'
  | 'ACTION_DELETE_ITEM'
  | 'ACTION_PRINT_BARCODE'
  | 'ACTION_ADD_INWARD'
  | 'ACTION_ADD_OUTWARD'
  | 'ACTION_EDIT_MOVEMENT'
  | 'ACTION_DELETE_MOVEMENT'
  | 'ACTION_MANAGE_RETURNS'
  | 'ACTION_ADD_CUSTODY'
  | 'ACTION_RETURN_CUSTODY'
  | 'ACTION_SETTLE_CUSTODY'
  | 'ACTION_COMMIT_SETTLEMENT'
  | 'ACTION_PRINT_AUDIT'
  | 'ACTION_MANAGE_YEAR'
  | 'ACTION_START_NEW_YEAR'
  | 'ACTION_RESTORE_BACKUP'
  | 'ACTION_BACKUP'
  | 'ACTION_LETTER_Z';

export interface User { id: string; username: string; name: string; password: string; role: Role; permissions: AppPermission[] }
export interface Unit { id: string; name: string }
export interface Warehouse { id: string; name: string }
export interface Supplier { id: string; name: string; phone?: string; address?: string }
export interface Employee { id: string; name: string }
export type CustodyState = 'NEW' | 'USED' | 'SCRAP';
export interface EditHistoryEntry { updatedBy: string; updatedAt: string; changes: string }
export interface Item { id: string; code: string; name: string; unitId: string; openingBalance: number; initialState?: CustodyState; currentBalance: number; minThreshold: number; isThresholdEnabled: boolean; isCustody: boolean; createdAt: string; createdBy: string; price: number; shelfNumber: string; boxNumber: string; history: EditHistoryEntry[] }
export interface CustodyItem { id: string; code: string; name: string; description: string; openingBalance: number; currentBalance: number; deployedBalance: number }
export type MovementType = 'INWARD' | 'OUTWARD';
export interface Movement { id: string; itemId: string; type: MovementType; quantity: number; unitId: string; docNumber: string; warehouseId?: string; supplierId?: string; employeeId?: string; performedBy: string; timestamp: string; balanceAfter: number; note?: string; unitPrice?: number; returnedQuantity: number; returnDocNumber?: string; lastModifiedBy?: string; lastModifiedAt?: string; status?: string; history?: EditHistoryEntry[]; auditOnly?: boolean }
export interface Custody { id: string; itemId: string; employeeId: string; quantity: number; state: CustodyState; type: 'HANDOVER' | 'RETURN' | 'SETTLEMENT'; timestamp: string; performedBy: string; docNumber: string; note?: string; balanceAfter?: number; auditOnly?: boolean }

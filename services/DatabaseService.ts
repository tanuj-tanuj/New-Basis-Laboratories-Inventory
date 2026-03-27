
import { InventoryItem, MaterialRequest, User, AuditLog, BatchStatus } from '../types';
import { 
  db, auth, 
  doc, getDoc, setDoc, updateDoc, deleteDoc, 
  collection, query, where, getDocs, onSnapshot, 
  Timestamp 
} from '../firebase';

const SUPER_ADMIN_EMAIL = 'tanujr91@gmail.com';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

class DatabaseService {
  private handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
        tenantId: auth.currentUser?.tenantId,
        providerInfo: auth.currentUser?.providerData.map(provider => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL
        })) || []
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  }

  // --- Users ---
  async getUser(userId: string): Promise<User | null> {
    const path = `users/${userId}`;
    try {
      const docSnap = await getDoc(doc(db, 'users', userId));
      return docSnap.exists() ? (docSnap.data() as User) : null;
    } catch (error) {
      this.handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  }

  async saveUser(user: User) {
    const path = `users/${user.id}`;
    try {
      // Protection: Cannot change super admin role or approval status via standard save if it violates rules
      if (user.email.toLowerCase() === SUPER_ADMIN_EMAIL) {
        user.role = 'admin';
        user.isApproved = true;
      }
      await setDoc(doc(db, 'users', user.id), user);
    } catch (error) {
      this.handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  async getUsers(): Promise<User[]> {
    const path = 'users';
    try {
      const q = query(collection(db, 'users'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as User);
    } catch (error) {
      this.handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  }

  async deleteUser(userId: string) {
    const path = `users/${userId}`;
    try {
      await deleteDoc(doc(db, 'users', userId));
      return true;
    } catch (error) {
      this.handleFirestoreError(error, OperationType.DELETE, path);
      return false;
    }
  }

  async updateUserName(userId: string, newName: string) {
    const path = `users/${userId}`;
    try {
      await updateDoc(doc(db, 'users', userId), { name: newName });
      return true;
    } catch (error) {
      this.handleFirestoreError(error, OperationType.UPDATE, path);
      return false;
    }
  }

  async updateUserApproval(userId: string, isApproved: boolean) {
    const path = `users/${userId}`;
    try {
      await updateDoc(doc(db, 'users', userId), { isApproved });
      return true;
    } catch (error) {
      this.handleFirestoreError(error, OperationType.UPDATE, path);
      return false;
    }
  }

  async updateUserRole(userId: string, role: User['role']) {
    const path = `users/${userId}`;
    try {
      await updateDoc(doc(db, 'users', userId), { role });
      return true;
    } catch (error) {
      this.handleFirestoreError(error, OperationType.UPDATE, path);
      return false;
    }
  }

  // --- Logs ---
  async getLogs(): Promise<AuditLog[]> {
    const path = 'logs';
    try {
      const q = query(collection(db, 'logs'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs
        .map(doc => doc.data() as AuditLog)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      this.handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  }

  async clearLogs() {
    const path = 'logs';
    try {
      const q = query(collection(db, 'logs'));
      const querySnapshot = await getDocs(q);
      const deletePromises = querySnapshot.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);
    } catch (error) {
      this.handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  async logAction(user: User, action: AuditLog['action'], details: string) {
    const path = 'logs';
    try {
      const logId = Math.random().toString(36).substr(2, 9);
      const newLog: AuditLog = {
        id: logId,
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        action,
        details,
        timestamp: new Date().toISOString()
      };
      await setDoc(doc(db, 'logs', logId), newLog);
    } catch (error) {
      this.handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  // --- Inventory ---
  async getInventory(): Promise<InventoryItem[]> {
    const path = 'inventory';
    try {
      const q = query(collection(db, 'inventory'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as InventoryItem);
    } catch (error) {
      this.handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  }

  async saveInventoryItem(item: InventoryItem) {
    const path = `inventory/${item.batchNo}`;
    try {
      await setDoc(doc(db, 'inventory', item.batchNo), item);
    } catch (error) {
      this.handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  async deleteInventoryItem(batchNo: string) {
    const path = `inventory/${batchNo}`;
    try {
      await deleteDoc(doc(db, 'inventory', batchNo));
    } catch (error) {
      this.handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  // --- Requests ---
  async getRequests(): Promise<MaterialRequest[]> {
    const path = 'requests';
    try {
      const q = query(collection(db, 'requests'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as MaterialRequest);
    } catch (error) {
      this.handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  }

  async saveRequest(req: MaterialRequest) {
    const path = `requests/${req.id}`;
    try {
      await setDoc(doc(db, 'requests', req.id), req);
    } catch (error) {
      this.handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  async updateRequestStatus(requestId: string, status: MaterialRequest['status'], acceptedBy?: string) {
    const path = `requests/${requestId}`;
    try {
      await updateDoc(doc(db, 'requests', requestId), { status, acceptedBy: acceptedBy || null });
    } catch (error) {
      this.handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  // --- Real-time Listeners ---
  subscribeToInventory(callback: (items: InventoryItem[]) => void) {
    const path = 'inventory';
    return onSnapshot(collection(db, 'inventory'), (snapshot) => {
      callback(snapshot.docs.map(doc => doc.data() as InventoryItem));
    }, (error) => {
      this.handleFirestoreError(error, OperationType.LIST, path);
    });
  }

  subscribeToRequests(callback: (reqs: MaterialRequest[]) => void) {
    const path = 'requests';
    return onSnapshot(collection(db, 'requests'), (snapshot) => {
      callback(snapshot.docs.map(doc => doc.data() as MaterialRequest));
    }, (error) => {
      this.handleFirestoreError(error, OperationType.LIST, path);
    });
  }

  subscribeToUsers(callback: (users: User[]) => void) {
    const path = 'users';
    return onSnapshot(collection(db, 'users'), (snapshot) => {
      callback(snapshot.docs.map(doc => doc.data() as User));
    }, (error) => {
      this.handleFirestoreError(error, OperationType.LIST, path);
    });
  }

  subscribeToLogs(callback: (logs: AuditLog[]) => void) {
    const path = 'logs';
    return onSnapshot(collection(db, 'logs'), (snapshot) => {
      callback(snapshot.docs
        .map(doc => doc.data() as AuditLog)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      );
    }, (error) => {
      this.handleFirestoreError(error, OperationType.LIST, path);
    });
  }
}

export const dbService = new DatabaseService();

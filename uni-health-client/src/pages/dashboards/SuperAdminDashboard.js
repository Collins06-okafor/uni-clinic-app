import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

export default function SuperAdminDashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "doctor" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Enhanced logout function
  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
    navigate("/login", { replace: true });
  };

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/superadmin/users");
      setUsers(res.data);
      setMessage("");
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to fetch users";
      setMessage(errorMsg);

      if (err.response?.status === 401 || err.response?.status === 403) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  // Create user
  const createUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/superadmin/users", form);
      setForm({ name: "", email: "", password: "", role: "doctor" });
      setMessage("User created successfully");
      fetchUsers();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  // Delete user
  const deleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    setLoading(true);
    try {
      await api.delete(`/superadmin/users/${id}`);
      setMessage("User deleted successfully");
      fetchUsers();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to delete user");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h2 mb-0">SuperAdmin Dashboard</h1>
              <p className="text-muted mb-0">Welcome back, {user?.name}</p>
            </div>
            <button className="btn btn-outline-danger" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {message && (
        <div className={`alert ${message.includes('successfully') ? 'alert-success' : 'alert-danger'} alert-dismissible`}>
          {message}
          <button
            type="button"
            className="btn-close"
            onClick={() => setMessage("")}
          ></button>
        </div>
      )}

      {/* Create User Form */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">Create New User</h5>
            </div>
            <div className="card-body">
              <form onSubmit={createUser}>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Name</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter full name"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="Enter email address"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Password</label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Enter password"
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Role</label>
                    <select
                      className="form-select"
                      value={form.role}
                      onChange={e => setForm({ ...form, role: e.target.value })}
                    >
                      <option value="doctor">Doctor</option>
                      <option value="admin">Admin</option>
                      <option value="clinical_staff">Clinical Staff</option>
                    </select>
                  </div>
                </div>
                <div className="row mt-3">
                  <div className="col-12">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Creating...
                        </>
                      ) : (
                        'Create User'
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">System Users</h5>
            </div>
            <div className="card-body">
              {loading && users.length === 0 ? (
                <div className="text-center py-4">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2">Loading users...</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-striped table-hover">
                    <thead className="table-dark">
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="text-center py-4">No users found</td>
                        </tr>
                      ) : (
                        users.map(u => (
                          <tr key={u.id}>
                            <td>{u.id}</td>
                            <td>{u.name}</td>
                            <td>{u.email}</td>
                            <td>
                              <span className={`badge ${
                                u.role === 'doctor' ? 'bg-success' :
                                u.role === 'admin' ? 'bg-primary' :
                                u.role === 'clinical_staff' ? 'bg-info' :
                                'bg-secondary'
                              }`}>
                                {u.role?.replace('_', ' ') || 'Unknown'}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${u.status === 'active' ? 'bg-success' : 'bg-warning'}`}>
                                {u.status || 'Unknown'}
                              </span>
                            </td>
                            <td>
                              {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                            </td>
                            <td>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => deleteUser(u.id)}
                                disabled={loading}
                              >
                                {loading ? '...' : 'Delete'}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

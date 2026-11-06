function deleteDelegate(Delegate) {
  return async (req, res) => {
    try {
      const query = req.params.mssv.trim().toUpperCase();
      const deleted = await Delegate.findOneAndDelete({ $or: [{ mssv: query }, { id: query }] });
      if (!deleted) return res.status(404).json({ message: 'Đại biểu không còn tồn tại. Vui lòng tải lại danh sách.' });
      res.json({ success: true, message: 'Đã xóa đại biểu thành công.' });
    } catch {
      res.status(500).json({ message: 'Không thể xóa đại biểu. Vui lòng thử lại.' });
    }
  };
}
module.exports = { deleteDelegate };

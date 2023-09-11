
export default async function checkingUserType( pool, token, type ) {
    const [[check]] = await pool.execute(`    
        SELECT type
        FROM user
        WHERE token = ?`, [token]);

    return check.type == type
}
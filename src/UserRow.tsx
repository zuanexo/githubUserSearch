import { useEffect, useState } from "react";
import { publicUser, userSearchResultItem } from "./types";

const UserRow = ({
  data,
  onLoad,
}: {
  data: userSearchResultItem;
  onLoad: (login?: string) => Promise<publicUser>;
}) => {
  const [user, setuser] = useState<publicUser | null>();
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const getUser = async () => {
    try {
      setLoading(true);
      setHasError(false);
      const pubUser = await onLoad(data.login);
      setuser(pubUser);
    } catch (error) {
      console.log({ error, data });
      setHasError(true);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    getUser();
  }, []);

  const onRowClick = () => {
    if (hasError) {
      getUser();
    } else {
      window.open(data.html_url, "_blank");
    }
  };

  return (
    <>
      <tr onClick={onRowClick}>
        <td className="avatarContainer">
          <img src={data.avatar_url} className="avatar" />
        </td>
        <td>{data.login}</td>
        <td>
          {loading ? (
            <span>Loading ...</span>
          ) : hasError ? (
            <span>Error</span>
          ) : (
            user?.name || "-"
          )}
        </td>
        <td>
          {loading ? (
            <span>Loading ...</span>
          ) : hasError ? (
            <span>Error</span>
          ) : (
            user?.followers ?? "-"
          )}
        </td>

        <td>
          {loading ? (
            <span>Loading ...</span>
          ) : hasError ? (
            <span>Error</span>
          ) : (
            user?.company ?? "-"
          )}
        </td>
        <td>
          {loading ? (
            <span>Loading ...</span>
          ) : hasError ? (
            <span>Error</span>
          ) : (
            user?.location ?? "-"
          )}
        </td>
      </tr>
    </>
  );
};

export default UserRow;

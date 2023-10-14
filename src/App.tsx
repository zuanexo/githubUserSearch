import { useEffect, useMemo, useRef, useState } from "react";
import "./App.scss";
import { Octokit } from "octokit";
import { Button, Col, Form, Row, Table } from "react-bootstrap";
import UserRow from "./UserRow";
import { publicUser, userSearchResultItem } from "./types";

function App() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [searchResults, setSearchResults] = useState<userSearchResultItem[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [key, setKey] = useState("");
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [useCache, setUseCache] = useState(true);
  const [userCache, setUserCache] = useState<{}>(
    JSON.parse(localStorage.getItem("userCache") || "{}")
  );

  const octoKit = useMemo(() => {
    return new Octokit({
      auth: key,
    });
  }, [key]);

  const timer = useRef(null);
  const prevSearch = useRef(search);

  useEffect(() => {
    timer.current && clearTimeout(timer.current);
    if (search) {
      setLoading(true);
      setHasNextPage(false);
      setHasError(false);
      if (search != prevSearch.current) {
        prevSearch.current = search;
        setPage(1);
      }
      timer.current = setTimeout(() => {
        onSearch(page, search);
      }, 1000);
    }
  }, [page, search]);

  const getUsers = async (search = "", page = 1) => {
    const response = await octoKit.request("GET /search/users", {
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
      q: `${search}+in:name+type:user`,
      sort: "followers",
      order: "desc",
      page: page,
      per_page: 10,
    });
    return response;
  };

  const getUserData = async (login = "") => {
    return await octoKit.request("GET /users/{username}", {
      username: login,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
  };

  const retrieveUserData = async (login = "") => {
    let returnObject;

    if (userCache?.[login]?.time && useCache) {
      const timeDifference = Date.now() - userCache?.[login].time;
      const milisecondsIn6Hours = 6 * 60 * 60 * 1000;

      if (timeDifference < milisecondsIn6Hours) {
        returnObject = userCache?.[login]?.data;
        return returnObject as publicUser;
      }
    }
    const response = await getUserData(login);
    setUserCache((val) => {
      const newState = { ...val };
      newState[login] = newState[login] ?? {};
      newState[login] = { data: response.data, time: Date.now() };
      localStorage.setItem("userCache", JSON.stringify(newState));
      return newState;
    });

    return response.data as publicUser;
  };

  const onSearch = async (page = 1, search = "") => {
    try {
      const searchCache = JSON.parse(
        localStorage.getItem("searchCache") || "{}"
      );

      if (searchCache?.[search]?.[page] && useCache) {
        const timeDifference = Date.now() - searchCache?.[search]?.[page].time;
        const milisecondsIn6Hours = 6 * 60 * 60 * 1000;

        if (timeDifference < milisecondsIn6Hours) {
          setSearchResults(searchCache?.[search]?.[page]?.data?.items);
          setHasNextPage(
            searchCache?.[search]?.[page]?.data.total_count
              ? page * 10 < searchCache?.[search]?.[page]?.data.total_count
              : false
          );
          return;
        }
      }
      const response = await getUsers(search, page);
      searchCache[search] = searchCache[search] ?? {};
      searchCache[search][page] = { data: response.data, time: Date.now() };
      localStorage.setItem("searchCache", JSON.stringify(searchCache));
      setHasNextPage(
        response.data.total_count
          ? page * 10 < response.data.total_count
          : false
      );
      setSearchResults(response.data.items as any as userSearchResultItem[]);
    } catch (error) {
      console.log({ error });
      setHasError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="vw-100 min-vh-100 container-lg p-2 p-sm-5  d-flex flex-column align-items-stretch overflow-y-auto">
        <h1 className="fw-bold my-5">Github users search</h1>

        <Form onSubmit={(e) => e.preventDefault()}>
          <Row>
            <Col sm md={6}>
              <Form.Group className="mb-3" controlId="formBasicEmail">
                <Form.Label>Github token</Form.Label>
                <Form.Control
                  placeholder="Enter token"
                  value={key}
                  name="token"
                  onChange={(e) => setKey(e.currentTarget.value)}
                />
                <Form.Text className="text-muted">
                  Provide your token for API calls
                </Form.Text>
              </Form.Group>
            </Col>
            <Col sm md={6}>
              <Form.Group className="mb-3" controlId="formBasicEmail">
                <Form.Label>Search</Form.Label>
                <Form.Control
                  placeholder="Enter user's name"
                  value={search}
                  name="name"
                  onChange={(e) => setSearch(e.currentTarget.value)}
                />
                <Form.Text className="text-muted">
                  Enter user's name, not username
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>
          <Form.Group className="mb-3" controlId="formBasicCheckbox">
            <Form.Check
              type="checkbox"
              checked={useCache}
              onChange={() => setUseCache((b) => !b)}
              label="Cache Results"
            />
          </Form.Group>
        </Form>
        {!!searchResults?.length && (
          <>
            <div className="d-flex align-items-center justify-content-between mt-5">
              <Button
                disabled={page == 1}
                onClick={() => setPage((p) => p - 1 || 1)}
                className={`pageButton `}
              >
                Prev Page
              </Button>
              <span>Page - {page}</span>
              <Button
                disabled={!hasNextPage}
                onClick={() => setPage((p) => (hasNextPage ? p + 1 : p))}
                className={`pageButton`}
              >
                Next Page
              </Button>
            </div>
            <div className="w-100 mt-2 table-container">
              <Table className={loading ? "blur" : ""}>
                <thead>
                  <tr>
                    <th className="avatarContainer"></th>
                    <th>Username</th>
                    <th>Name </th>
                    <th>Followers </th>
                    <th>Company </th>
                    <th>Location </th>
                  </tr>
                </thead>
                <tbody>
                  {searchResults.map((val) => {
                    return (
                      <UserRow
                        data={val}
                        key={val.login}
                        onLoad={retrieveUserData}
                      />
                    );
                  })}
                </tbody>
              </Table>
              {!loading && hasError && (
                <div className="loaderOverlay text-danger-emphasis">
                  ⚠️ Error
                </div>
              )}
              {loading && <div className="loaderOverlay">⏳ Loading...</div>}
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default App;

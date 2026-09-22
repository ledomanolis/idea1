import Rail from "@/components/Rail";
import { createScheme } from "@/app/schemes/actions";

export default function NewSchemePage() {
  return (
    <div className="shell">
      <Rail />
      <main className="content">
        <div className="doc">
          <div className="doc-head">
            <p className="file-no">New entry</p>
            <h2>Add a scheme</h2>
          </div>
          <form action={createScheme}>
            <div className="field">
              <label htmlFor="name">Scheme name</label>
              <input id="name" name="name" type="text" required autoFocus />
            </div>
            <button className="btn primary" type="submit">
              Add scheme
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

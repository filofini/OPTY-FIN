with open("crud.py", "r") as f:
    text = f.read()

text = text.replace("""from sqlalchemy.orm import Session
import models, schemas, schemas_enums
import datetime
    return db.query(models.Stock).offset(skip).limit(limit).all()""", """from sqlalchemy.orm import Session
import models, schemas, schemas_enums
import datetime

# -- Stock --
def get_stock(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Stock).offset(skip).limit(limit).all()""")

with open("crud.py", "w") as f:
    f.write(text)

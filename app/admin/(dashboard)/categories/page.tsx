import { getCategories } from './actions'
import { CategoryForm, EditCategoryForm, DeleteCategoryButton } from '../../../../components/admin/category-form'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../../../components/ui/dropdown-menu'
import { Button } from '../../../../components/ui/button'
import { MoreHorizontal, Pencil } from 'lucide-react'

export default async function CategoriesPage() {
  const categories = await getCategories()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Kategori</h1>
        <CategoryForm />
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead className="w-[100px] text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell>{category.name}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      <EditCategoryForm initialData={category} />
                      <DeleteCategoryButton id={category.id} name={category.name} />
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}